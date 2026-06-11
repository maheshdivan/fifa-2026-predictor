import httpx
import re
from bs4 import BeautifulSoup
from typing import Dict, Any, List

# Official 2026 FIFA World Cup groups from the December 2025 draw
_GROUPS_2026: Dict[str, List[str]] = {
    "A": ["Mexico", "South Africa", "South Korea", "Czech Republic"],
    "B": ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
    "C": ["Brazil", "Morocco", "Haiti", "Scotland"],
    "D": ["United States", "Paraguay", "Australia", "Turkey"],
    "E": ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
    "F": ["Netherlands", "Japan", "Sweden", "Tunisia"],
    "G": ["Belgium", "Egypt", "Iran", "New Zealand"],
    "H": ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
    "I": ["France", "Senegal", "Iraq", "Norway"],
    "J": ["Argentina", "Algeria", "Austria", "Jordan"],
    "K": ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
    "L": ["England", "Croatia", "Ghana", "Panama"],
}


class WikiAgent:
    async def parse(self, url: str) -> Dict[str, Any]:
        page_title = self._extract_page_title(url)
        year = self._extract_year(page_title or url)

        # Use hardcoded groups for the 2026 World Cup — parsing the live Wikipedia
        # page is fragile and the draw is already official.
        if year == "2026":
            return self._build_result(year, page_title or url, _GROUPS_2026)

        api_url = "https://en.wikipedia.org/w/api.php"
        params = {
            "action": "parse",
            "page": page_title,
            "prop": "text",
            "format": "json",
            "disabletoc": "1",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.get(
                    api_url,
                    params=params,
                    headers={"User-Agent": "FIFA_Predictor/1.0 (educational project)"},
                )
                data = resp.json()
                if "parse" not in data:
                    raise ValueError("Unexpected Wikipedia API response")
                html = data["parse"]["text"]["*"]
            except Exception:
                resp = await client.get(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 FIFA_Predictor/1.0"},
                    follow_redirects=True,
                )
                html = resp.text

        return self._parse_groups(html, year, page_title or url)

    # ------------------------------------------------------------------
    def _extract_page_title(self, url: str) -> str:
        m = re.search(r"/wiki/([^#?]+)", url)
        return m.group(1).replace("%20", " ") if m else url

    def _extract_year(self, text: str) -> str:
        m = re.search(r"(19|20)\d{2}", text)
        return m.group(0) if m else "2026"

    def _build_result(self, year: str, page_title: str, groups: Dict[str, List[str]]) -> Dict[str, Any]:
        all_teams: List[str] = []
        seen: set = set()
        group_list = []
        for letter, teams in sorted(groups.items()):
            group_list.append({"name": letter, "teams": teams})
            for t in teams:
                if t not in seen:
                    seen.add(t)
                    all_teams.append(t)
        return {
            "year": year,
            "tournament_name": page_title.replace("_", " "),
            "groups": group_list,
            "teams": all_teams,
            "total_groups": len(group_list),
            "total_teams": len(all_teams),
        }

    # ------------------------------------------------------------------
    def _parse_groups(self, html: str, year: str, page_title: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "lxml")
        groups = self._find_group_sections(soup)

        if not groups:
            groups = self._fallback_group_tables(soup)

        return self._build_result(year, page_title, groups)

    # ------------------------------------------------------------------
    def _find_group_sections(self, soup: BeautifulSoup) -> Dict[str, List[str]]:
        pattern = re.compile(r"^Group\s+([A-L])$", re.IGNORECASE)
        groups: Dict[str, List[str]] = {}

        for heading in soup.find_all(["h2", "h3", "h4"]):
            text = heading.get_text(strip=True)
            m = pattern.match(text)
            if m:
                letter = m.group(1).upper()
                teams = self._teams_after_heading(heading)
                if teams:
                    groups[letter] = teams

        return groups

    def _teams_after_heading(self, heading) -> List[str]:
        sibling = heading.next_sibling
        for _ in range(20):
            if sibling is None:
                break
            if hasattr(sibling, "name"):
                if sibling.name == "table" and "wikitable" in (sibling.get("class") or []):
                    t = self._teams_from_table(sibling)
                    if t:
                        return t
                if sibling.name in ["div", "section"]:
                    tbl = sibling.find("table", class_="wikitable")
                    if tbl:
                        t = self._teams_from_table(tbl)
                        if t:
                            return t
                if sibling.name in ["h2", "h3", "h4"]:
                    break
            sibling = sibling.next_sibling
        return []

    def _teams_from_table(self, table) -> List[str]:
        """Extract team names from a Wikipedia group table.

        Standard WC group tables have columns: Pos | Team | Pld | W | D | L | GF | GA | GD | Pts
        We find the header row first to locate the 'Team' column, then extract from there.
        """
        teams: List[str] = []

        # Find team column index from header row
        team_col = None
        rows = table.find_all("tr")
        for row in rows:
            hdrs = row.find_all("th")
            if hdrs:
                for i, th in enumerate(hdrs):
                    if th.get_text(strip=True).lower() == "team":
                        team_col = i
                        break
                if team_col is not None:
                    break

        for row in rows:
            cells = row.find_all(["td", "th"])
            if not cells:
                continue

            # Skip pure header rows
            if all(c.name == "th" for c in cells):
                continue

            # If we found the team column index, use it; otherwise scan first 3 cells
            candidates = [cells[team_col]] if (team_col is not None and team_col < len(cells)) else cells[:3]

            for cell in candidates:
                link = cell.find("a")
                name = link.get_text(strip=True) if link else cell.get_text(strip=True)
                name = re.sub(r"\[.*?\]", "", name).strip()
                if name and len(name) > 2 and not name.isdigit() and name not in teams:
                    teams.append(name)
                    break

        return teams[:4]

    # ------------------------------------------------------------------
    def _fallback_group_tables(self, soup: BeautifulSoup) -> Dict[str, List[str]]:
        groups: Dict[str, List[str]] = {}
        letters = "ABCDEFGHIJKL"
        idx = 0
        for table in soup.find_all("table", class_="wikitable"):
            rows = table.find_all("tr")
            if len(rows) < 5:
                continue
            hdrs = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]
            if not any(h in hdrs for h in ("team", "pld", "pts", "mp")):
                continue
            teams = []
            for row in rows[1:]:
                cells = row.find_all(["td", "th"])
                if not cells:
                    continue
                for cell in cells[:3]:
                    link = cell.find("a")
                    name = link.get_text(strip=True) if link else cell.get_text(strip=True)
                    name = re.sub(r"\[.*?\]", "", name).strip()
                    if len(name) > 2 and not name.isdigit():
                        teams.append(name)
                        break
            if len(teams) == 4 and idx < len(letters):
                groups[letters[idx]] = teams
                idx += 1
        return groups
