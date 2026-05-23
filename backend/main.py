import asyncio
import json
import os
from typing import Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from dotenv import load_dotenv

load_dotenv()

from agents.wiki_agent import WikiAgent
from agents.football_data_agent import FootballDataAgent
from agents.prediction_agent import PredictionAgent
from agents.quiz_agent import QuizAgent

app = FastAPI(title="FIFA 2026 World Cup Predictor")

# ALLOWED_ORIGINS env var = comma-separated list, e.g.:
#   https://fifa-predictor.vercel.app,https://my-custom-domain.com
# Falls back to permissive wildcard for local dev if not set.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
CORS_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()] or ["*"]

# allow_credentials must be False when allow_origins=["*"] — browsers reject the
# combination and strip CORS headers entirely, breaking all cross-origin requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/predict/stream")
async def predict_stream(
    wiki_url: str = Query(..., description="Wikipedia URL for the World Cup"),
    overrides: Optional[str] = Query(None, description="JSON-encoded user overrides"),
):
    parsed_overrides: Optional[dict] = None
    if overrides:
        try:
            parsed_overrides = json.loads(overrides)
        except json.JSONDecodeError:
            parsed_overrides = None

    is_rerun = bool(parsed_overrides and (
        parsed_overrides.get("groupOverrides") or parsed_overrides.get("knockoutOverrides")
    ))

    async def generator():
        try:
            yield {"event": "progress", "data": json.dumps({
                "step": "start",
                "message": "Re-running with your custom picks..." if is_rerun else "Starting analysis...",
                "progress": 5,
            })}

            # --- Step 1: Parse Wikipedia ---
            yield {"event": "progress", "data": json.dumps({
                "step": "wiki",
                "message": "Fetching and parsing World Cup Wikipedia page...",
                "progress": 10,
            })}
            wiki_agent = WikiAgent()
            wc_data = await wiki_agent.parse(wiki_url)
            yield {"event": "progress", "data": json.dumps({
                "step": "wiki_done",
                "message": f"Found {wc_data['total_teams']} teams across {wc_data['total_groups']} groups",
                "progress": 28,
                "wc_data": wc_data,
            })}

            await asyncio.sleep(0.3)

            # --- Step 2: Fetch league/player data ---
            yield {"event": "progress", "data": json.dumps({
                "step": "football_data",
                "message": "Fetching Premier League, La Liga, Ligue 1 & Serie A data...",
                "progress": 35,
            })}
            fd_agent = FootballDataAgent()
            football_data = await fd_agent.get_strength_data(wc_data.get("teams", []))
            league_count = len(football_data.get("league_standings", {}))
            yield {"event": "progress", "data": json.dumps({
                "step": "football_data_done",
                "message": f"Collected data from {league_count} major European leagues",
                "progress": 55,
            })}

            await asyncio.sleep(0.3)

            # --- Step 3: AI Prediction ---
            if is_rerun:
                n_group = len((parsed_overrides or {}).get("groupOverrides", []))
                n_ko = len((parsed_overrides or {}).get("knockoutOverrides", []))
                override_summary = []
                if n_group:
                    override_summary.append(f"{n_group} group{'s' if n_group > 1 else ''}")
                if n_ko:
                    override_summary.append(f"{n_ko} knockout match{'es' if n_ko > 1 else ''}")
                msg = f"Claude is re-simulating with your {' & '.join(override_summary)} overrides..."
            else:
                msg = "Claude is simulating the full tournament — this takes ~30 seconds..."

            yield {"event": "progress", "data": json.dumps({
                "step": "predicting",
                "message": msg,
                "progress": 60,
            })}

            pred_agent = PredictionAgent()
            predictions = await pred_agent.predict(wc_data, football_data, parsed_overrides)

            yield {"event": "progress", "data": json.dumps({
                "step": "predictions_done",
                "message": "Tournament simulation complete! Preparing results...",
                "progress": 95,
            })}

            await asyncio.sleep(0.3)

            yield {"event": "complete", "data": json.dumps({
                "predictions": predictions,
                "wc_data": wc_data,
            })}

        except Exception as exc:
            import traceback
            yield {"event": "error", "data": json.dumps({
                "message": str(exc),
                "detail": traceback.format_exc(),
            })}

    return EventSourceResponse(generator())


@app.get("/api/quiz")
async def get_quiz():
    quiz_agent = QuizAgent()
    questions = await quiz_agent.generate_questions()
    return {"questions": questions}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "anthropic_key_set": bool(os.getenv("ANTHROPIC_API_KEY")),
        "football_key_set": bool(os.getenv("FOOTBALL_DATA_API_KEY")),
    }
