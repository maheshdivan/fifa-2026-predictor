import os
import json
import re
from openai import AsyncOpenAI
from typing import Dict, Any

SYSTEM_PROMPT = """You are a world-class FIFA analyst with encyclopaedic knowledge of international football.
You have deep insight into every World Cup since 1994, team tactics, squad compositions, manager styles,
and the form of players in the top European leagues. You always back predictions with clear, concise reasoning."""

# Static prefix (cached by OpenAI for repeat calls)
STATIC_PREFIX = """\
## 2026 FIFA World Cup — Tournament Prediction

### Format
- 48 teams, 12 groups of 4 (Groups A–L)
- Top 2 per group + best 8 third-place teams = 32 teams enter the knockout stage
- Round of 32 seeding: A1vB2, B1vA2, C1vD2, D1vC2, E1vF2, F1vE2, G1vH2, H1vG2, I1vJ2, J1vI2, K1vL2, L1vK2, plus 4 matches involving the best 8 third-place finishers
- Round of 32 (16 matches) → Round of 16 (8) → QF (4) → SF (2) → 3rd-place match + Final

### Your task
The group compositions are the OFFICIAL December 2025 draw — they are fixed input, not for you to predict.
You must:
1. Fill in **position** (1–4 within the group), **points**, **gf**, **ga** for every team listed.
2. Choose the best 8 third-place teams for best_third_place.
3. Simulate every knockout match through to the champion.

Base your predictions on historical WC performance, squad quality, FIFA rankings, manager quality, and tactical matchups.

### Rules
- Return ONLY valid JSON — no prose, no markdown fences.
- r32 EXACTLY 16 matches, r16 EXACTLY 8, qf EXACTLY 4, sf EXACTLY 2.
- Team names in group_results are pre-filled — copy them VERBATIM; do NOT rename or replace any team.
- Each knockout match must only feature teams that qualified from your group results.
- Keep reasoning to 1 sentence per match. Be bold; include realistic upsets.\
"""

DYNAMIC_TEMPLATE = """\


### League Strength Indicators
{football_data_summary}

### Complete the following JSON (team names are already filled in — add the numbers):

{{
  "group_results": [
{group_results_template}
  ],
  "best_third_place": ["Country1","Country2","Country3","Country4","Country5","Country6","Country7","Country8"],
  "r32": [
    {{"match":"R32-1","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"R32-2","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R32-3","team1":"Country","team2":"Country","winner":"Country","score":"2-0","reasoning":"..."}},
    {{"match":"R32-4","team1":"Country","team2":"Country","winner":"Country","score":"3-1","reasoning":"..."}},
    {{"match":"R32-5","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R32-6","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"R32-7","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R32-8","team1":"Country","team2":"Country","winner":"Country","score":"2-0","reasoning":"..."}},
    {{"match":"R32-9","team1":"Country","team2":"Country","winner":"Country","score":"3-0","reasoning":"..."}},
    {{"match":"R32-10","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R32-11","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"R32-12","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R32-13","team1":"Country","team2":"Country","winner":"Country","score":"2-0","reasoning":"..."}},
    {{"match":"R32-14","team1":"Country","team2":"Country","winner":"Country","score":"1-1 (4-3p)","reasoning":"..."}},
    {{"match":"R32-15","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"R32-16","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}}
  ],
  "r16": [
    {{"match":"R16-1","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"R16-2","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R16-3","team1":"Country","team2":"Country","winner":"Country","score":"2-0","reasoning":"..."}},
    {{"match":"R16-4","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R16-5","team1":"Country","team2":"Country","winner":"Country","score":"3-1","reasoning":"..."}},
    {{"match":"R16-6","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"R16-7","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"R16-8","team1":"Country","team2":"Country","winner":"Country","score":"2-0","reasoning":"..."}}
  ],
  "qf": [
    {{"match":"QF-1","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"QF-2","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"QF-3","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}},
    {{"match":"QF-4","team1":"Country","team2":"Country","winner":"Country","score":"2-0","reasoning":"..."}}
  ],
  "sf": [
    {{"match":"SF-1","team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
    {{"match":"SF-2","team1":"Country","team2":"Country","winner":"Country","score":"1-0","reasoning":"..."}}
  ],
  "third_place": {{"team1":"Country","team2":"Country","winner":"Country","score":"2-1","reasoning":"..."}},
  "final": {{"team1":"Country","team2":"Country","winner":"Country","score":"1-0 (AET)","reasoning":"..."}},
  "champion": "Country",
  "champion_reasoning": "2-3 sentences on why this team wins the tournament"
}}
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
        group_results_template = self._build_group_template(wc_data, overrides)
        football_summary = football_data.get("summary", "No league data available")

        dynamic = DYNAMIC_TEMPLATE.format(
            group_results_template=group_results_template,
            football_data_summary=football_summary,
        )

        if overrides:
            override_text = self._format_overrides(overrides)
            if override_text:
                dynamic += OVERRIDE_ADDENDUM.format(override_text=override_text)

        user_content = STATIC_PREFIX + dynamic

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=8000,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        )

        raw = response.choices[0].message.content.strip()
        predictions = self._parse_response(raw)
        return self._fix_group_results(predictions, wc_data)

    def _build_group_template(self, wc_data: Dict[str, Any], overrides: Dict[str, Any] | None = None) -> str:
        """Build the group_results JSON template with team names pre-filled."""
        group_overrides = {go["group"]: go["teams"] for go in (overrides or {}).get("groupOverrides", [])}
        parts = []
        for group in wc_data.get("groups", []):
            letter = group["name"]
            if letter in group_overrides:
                team_names = [t["name"] for t in group_overrides[letter]]
            else:
                team_names = group.get("teams", [])

            team_lines = ",\n        ".join(
                f'{{"name":"{name}","position":?,"points":?,"gf":?,"ga":?}}'
                for name in team_names
            )
            parts.append(
                f'    {{"group":"{letter}","teams":[\n        {team_lines}\n    ]}}'
            )
        return ",\n".join(parts)

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

    def _fix_group_results(self, predictions: Dict[str, Any], wc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Safety net: replace any hallucinated team names with the official draw teams."""
        correct_by_group = {g["name"]: g["teams"] for g in wc_data.get("groups", [])}

        for group_result in predictions.get("group_results", []):
            letter = group_result.get("group", "")
            if letter not in correct_by_group:
                continue
            correct = correct_by_group[letter]
            current_names = [t["name"] for t in group_result.get("teams", [])]

            if set(current_names) == set(correct):
                continue

            used: set = set()
            fixed: list = []
            for team_entry in group_result["teams"]:
                if team_entry["name"] in correct:
                    fixed.append(team_entry)
                    used.add(team_entry["name"])
                else:
                    fixed.append(None)

            remaining = [t for t in correct if t not in used]
            ri = 0
            for i, slot in enumerate(fixed):
                if slot is None and ri < len(remaining):
                    fixed[i] = {**group_result["teams"][i], "name": remaining[ri]}
                    ri += 1

            final = [t for t in fixed if t is not None]
            for t in correct:
                if t not in {e["name"] for e in final}:
                    final.append({"name": t, "position": len(final) + 1, "points": 0, "gf": 0, "ga": 0})
            group_result["teams"] = final[:4]

        return predictions

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
