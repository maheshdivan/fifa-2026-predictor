import httpx
import os
from typing import Dict, Any, List

BASE_URL = "https://api.football-data.org/v4"

LEAGUES = {
    "PL": "Premier League",
    "PD": "La Liga",
    "FL1": "Ligue 1",
    "SA": "Serie A",
    "BL1": "Bundesliga",
}


class FootballDataAgent:
    def __init__(self):
        self.api_key = os.getenv("FOOTBALL_DATA_API_KEY", "")
        self.headers = {"X-Auth-Token": self.api_key}

    async def get_strength_data(self, teams: List[str]) -> Dict[str, Any]:
        league_data: Dict[str, Any] = {}
        top_scorers: Dict[str, Any] = {}
        errors: List[str] = []

        async with httpx.AsyncClient(timeout=20.0, headers=self.headers) as client:
            for code, name in LEAGUES.items():
                try:
                    standings_resp = await client.get(f"{BASE_URL}/competitions/{code}/standings")
                    if standings_resp.status_code == 200:
                        data = standings_resp.json()
                        league_data[code] = self._summarise_standings(name, data)
                    else:
                        errors.append(f"{name} standings: {standings_resp.status_code}")
                except Exception as e:
                    errors.append(f"{name}: {e}")

            for code, name in LEAGUES.items():
                try:
                    scorers_resp = await client.get(
                        f"{BASE_URL}/competitions/{code}/scorers",
                        params={"limit": 5},
                    )
                    if scorers_resp.status_code == 200:
                        data = scorers_resp.json()
                        top_scorers[code] = self._summarise_scorers(name, data)
                    else:
                        errors.append(f"{name} scorers: {scorers_resp.status_code}")
                except Exception as e:
                    errors.append(f"{name} scorers: {e}")

        return {
            "league_standings": league_data,
            "top_scorers": top_scorers,
            "errors": errors,
            "summary": self._build_summary(league_data, top_scorers),
        }

    def _summarise_standings(self, league_name: str, data: Dict) -> Dict:
        summary = {"league": league_name, "season": "", "top_clubs": []}
        try:
            competition = data.get("competition", {})
            summary["season"] = data.get("season", {}).get("startDate", "")[:4]
            standings = data.get("standings", [])
            total_table = next(
                (s for s in standings if s.get("type") == "TOTAL"), None
            )
            if total_table:
                for entry in total_table.get("table", [])[:5]:
                    team = entry.get("team", {})
                    summary["top_clubs"].append({
                        "position": entry.get("position"),
                        "team": team.get("name", ""),
                        "tla": team.get("tla", ""),
                        "points": entry.get("points"),
                        "won": entry.get("won"),
                        "draw": entry.get("draw"),
                        "lost": entry.get("lost"),
                        "goalsFor": entry.get("goalsFor"),
                        "goalsAgainst": entry.get("goalsAgainst"),
                    })
        except Exception:
            pass
        return summary

    def _summarise_scorers(self, league_name: str, data: Dict) -> Dict:
        scorers = []
        try:
            for s in data.get("scorers", []):
                player = s.get("player", {})
                team = s.get("team", {})
                scorers.append({
                    "player": player.get("name", ""),
                    "nationality": player.get("nationality", ""),
                    "team": team.get("name", ""),
                    "goals": s.get("goals", 0),
                    "assists": s.get("assists", 0),
                })
        except Exception:
            pass
        return {"league": league_name, "scorers": scorers}

    def _build_summary(self, league_data: Dict, scorers_data: Dict) -> str:
        lines = ["## Current European League Data\n"]
        for code, info in league_data.items():
            lines.append(f"### {info.get('league', code)} ({info.get('season', '?')})")
            for club in info.get("top_clubs", []):
                lines.append(
                    f"  {club['position']}. {club['team']} — {club['points']}pts "
                    f"W{club['won']} D{club['draw']} L{club['lost']}"
                )
            lines.append("")

        lines.append("### Top Scorers")
        for code, info in scorers_data.items():
            for s in info.get("scorers", [])[:3]:
                lines.append(f"  {s['player']} ({s['nationality']}): {s['goals']}g")
        return "\n".join(lines)
