import os
import json
import re
from openai import AsyncOpenAI
from typing import Dict, Any

SYSTEM_PROMPT = """You are a world-class FIFA analyst with encyclopaedic knowledge of international football.
You have deep insight into every World Cup since 1994, team tactics, squad compositions, manager styles,
and the form of players in the top European leagues. You always back predictions with clear, concise reasoning."""

# Static portion placed first — OpenAI automatically caches prompt prefixes >1024 tokens
STATIC_PROMPT = """\
## 2026 FIFA World Cup — Full Tournament Prediction

### Tournament Structure (2026 Format)
- 48 teams, 12 groups of 4 (Groups A–L)
- Top 2 from each group advance (24 teams) + best 8 third-place teams = 32 teams
- Knockout: Round of 32 (16 matches) → Round of 16 (8 matches) → QF (4 matches) → SF (2 matches) → 3rd place + Final

### Your Task
Based on:
1. Each team's historical World Cup performance (2006, 2010, 2014, 2018, 2022)
2. Current squad quality evidenced by league data below
3. FIFA World Rankings (use your knowledge)
4. Manager quality and tactical sophistication
5. Tournament experience and big-game mentality
6. Physical/tactical matchup dynamics

Predict the **complete 2026 FIFA World Cup** including:
- Group stage finishing positions for all 12 groups
- Which 8 third-place teams advance (best 8)
- All 16 Round of 32 matches (official 2026 seeding: A1vB2, B1vA2, C1vD2, D1vC2, E1vF2, F1vE2, G1vH2, H1vG2, I1vJ2, J1vI2, K1vL2, L1vK2, plus 4 matches for best 8 third-place qualifiers)
- All 8 Round of 16 matches (winners from Round of 32)
- All 4 Quarter-final matches
- Both Semi-final matches
- Third-place match
- Final and champion

Return ONLY a valid JSON object in this exact structure (no other text):

{
  "group_results": [
    {
      "group": "A",
      "teams": [
        {"name": "TeamName", "position": 1, "points": 9, "gf": 7, "ga": 2},
        {"name": "TeamName", "position": 2, "points": 6, "gf": 4, "ga": 3},
        {"name": "TeamName", "position": 3, "points": 3, "gf": 2, "ga": 4},
        {"name": "TeamName", "position": 4, "points": 0, "gf": 1, "ga": 8}
      ]
    }
  ],
  "best_third_place": ["Country1", "Country2", "Country3", "Country4", "Country5", "Country6", "Country7", "Country8"],
  "r32": [
    {"match": "R32-1", "team1": "Country", "team2": "Country", "winner": "Country", "score": "2-1", "reasoning": "..."}
  ],
  "r16": [
    {"match": "R16-1", "team1": "Country", "team2": "Country", "winner": "Country", "score": "2-1", "reasoning": "..."}
  ],
  "qf": [
    {"match": "QF-1", "team1": "Country", "team2": "Country", "winner": "Country", "score": "1-0", "reasoning": "..."}
  ],
  "sf": [
    {"match": "SF-1", "team1": "Country", "team2": "Country", "winner": "Country", "score": "2-1", "reasoning": "..."}
  ],
  "third_place": {"team1": "Country", "team2": "Country", "winner": "Country", "score": "2-1", "reasoning": "..."},
  "final": {"team1": "Country", "team2": "Country", "winner": "Country", "score": "1-0 (AET)", "reasoning": "..."},
  "champion": "Country",
  "champion_reasoning": "2-3 sentences on why this team wins the tournament"
}

IMPORTANT: r32 must have EXACTLY 16 matches, r16 EXACTLY 8, qf EXACTLY 4, sf EXACTLY 2.
Each match's teams must be drawn from winners of the previous round.
Be bold with predictions. Consider realistic upsets. Keep reasoning to 1 sentence per match.\
"""

DYNAMIC_TEMPLATE = """\

### Qualified Teams by Group
{groups_text}

### Current European League Strength Indicators
{football_data_summary}
"""

OVERRIDE_ADDENDUM = """
### ⚠️ USER OVERRIDES — FIXED, DO NOT CHANGE

{override_text}

Adjust ALL downstream rounds (R32, R16, QF, SF, Final) to reflect these. Any team eliminated by
an override must not appear in subsequent rounds. The champion must be consistent with all overrides.
"""


class PredictionAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

    async def predict(self, wc_data: Dict[str, Any], football_data: Dict[str, Any],
                      overrides: Dict[str, Any] | None = None) -> Dict[str, Any]:
        groups_text = self._format_groups(wc_data, overrides)
        football_summary = football_data.get("summary", "No league data available")

        dynamic = DYNAMIC_TEMPLATE.format(
            groups_text=groups_text,
            football_data_summary=football_summary,
        )

        if overrides:
            override_text = self._format_overrides(overrides)
            if override_text:
                dynamic += OVERRIDE_ADDENDUM.format(override_text=override_text)

        # Static prompt goes first so OpenAI's automatic prefix cache applies to it
        user_content = STATIC_PROMPT + dynamic

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=8000,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )

        raw = response.choices[0].message.content.strip()
        return self._parse_response(raw)

    def _format_overrides(self, overrides: Dict[str, Any]) -> str:
        lines = []

        group_overrides = overrides.get("groupOverrides", [])
        if group_overrides:
            lines.append("**Group Stage Overrides:**")
            for go in group_overrides:
                group = go.get("group", "?")
                teams = go.get("teams", [])
                team_names = [f"{i+1}. {t['name']}" for i, t in enumerate(teams)]
                lines.append(f"  Group {group}: {', '.join(team_names)}")

        knockout_overrides = overrides.get("knockoutOverrides", [])
        if knockout_overrides:
            lines.append("\n**Knockout Stage Overrides:**")
            for ko in knockout_overrides:
                round_name = ko.get("round", "").upper().replace("_", " ")
                match_id = ko.get("matchId", "")
                team1 = ko.get("team1", "?")
                team2 = ko.get("team2", "?")
                winner = ko.get("newWinner", "?")
                lines.append(f"  {round_name} ({match_id}): {team1} vs {team2} → WINNER: {winner}")

        return "\n".join(lines)

    def _format_groups(self, wc_data: Dict[str, Any], overrides: Dict[str, Any] | None = None) -> str:
        lines = []
        group_overrides = {go["group"]: go["teams"] for go in (overrides or {}).get("groupOverrides", [])}
        for group in wc_data.get("groups", []):
            name = group["name"]
            if name in group_overrides:
                team_names = [t["name"] for t in group_overrides[name]]
                lines.append(f"Group {name} (USER ORDER): {', '.join(team_names)}")
            else:
                teams = ", ".join(group.get("teams", []))
                lines.append(f"Group {name}: {teams}")
        return "\n".join(lines) if lines else "Groups not yet available"

    def _parse_response(self, raw: str) -> Dict[str, Any]:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError("Prediction response did not contain valid JSON")

        text = match.group(0)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            text = re.sub(r",\s*([}\]])", r"\1", text)  # strip trailing commas
            return json.loads(text)
