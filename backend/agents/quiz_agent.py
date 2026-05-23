import os
import json
import re
import anthropic
from typing import List, Dict, Any

QUIZ_PROMPT = """Generate exactly 10 engaging FIFA World Cup trivia questions covering tournaments from 1994 to 2022.

Include a variety of topics:
- Tournament winners and runners-up
- Top scorers (Golden Boot winners)
- Famous goals and moments
- Host countries and venues
- Records and firsts
- Player achievements
- Notable upsets and surprises

Return a valid JSON array with exactly 10 items. Each item must follow this structure:
{
  "id": "q1",
  "question": "Which country won the 2018 FIFA World Cup?",
  "options": {
    "A": "Croatia",
    "B": "France",
    "C": "Belgium",
    "D": "England"
  },
  "correct_answer": "B",
  "fun_fact": "France beat Croatia 4-2 in the final. It was France's second World Cup title after 1998."
}

Mix difficulty: 3 easy, 4 medium, 3 hard. Use ids q1 through q10.
Make sure wrong answers are plausible. No trick questions. Return only the JSON array, no other text."""


class QuizAgent:
    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))

    async def generate_questions(self) -> List[Dict[str, Any]]:
        # Haiku is sufficient for trivia generation and is ~20x cheaper than Sonnet.
        # Cache the static prompt — benefits concurrent users within the same 5-min window.
        message = await self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [{
                    "type": "text",
                    "text": QUIZ_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }],
            }],
        )
        raw = message.content[0].text.strip()

        match = re.search(r"\[.*\]", raw, re.DOTALL)
        if not match:
            raise ValueError("Quiz response did not contain a JSON array")

        return json.loads(match.group(0))
