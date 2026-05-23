# ⚽ FIFA 2026 World Cup Predictor

An AI-powered web application that predicts the complete 2026 FIFA World Cup tournament — from group stage all the way to the final — using real football data and Claude AI.

---

## What it does

1. **Paste a Wikipedia URL** (e.g. the 2026 FIFA World Cup page)
2. **While Claude analyses**, take a 10-question FIFA trivia quiz to pass the time
3. **Get full predictions** — all 12 groups, Round of 16, Quarter-finals, Semi-finals, and the Final
4. **Override results** — disagree with Claude? Reorder groups or flip match winners yourself
5. **Re-predict** — Claude re-runs the tournament respecting your custom picks

---

## Screenshots

### Landing Page
![Landing Page](docs/screenshot-landing.png)

### Live Analysis + Quiz
![Loading Screen](docs/screenshot-loading.png)

### Group Stage Results
![Group Stage](docs/screenshot-groups.png)

### Knockout Bracket
![Bracket](docs/screenshot-bracket.png)

### Edit Mode
![Edit Mode](docs/screenshot-edit.png)

---

## How predictions work

```
Wikipedia URL
     │
     ▼
WikiAgent ──────────────────── Parses groups, teams, match schedule
     │
     ▼
FootballDataAgent ──────────── Fetches current standings & top scorers
     │                         (Premier League, La Liga, Ligue 1,
     │                          Serie A, Bundesliga)
     ▼
PredictionAgent (Claude AI) ── Analyses 20 years of WC history,
     │                         squad quality, player form, FIFA rankings
     │                         → Predicts all 7 rounds
     ▼
QuizAgent (Claude AI) ───────── Generates 10 trivia questions
                                in parallel while predictions run
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Backend | Python + FastAPI |
| Streaming | Server-Sent Events (SSE) |
| AI Engine | Anthropic Claude (claude-sonnet-4-6) |
| Football Data | football-data.org API |
| Tournament Data | Wikipedia REST API |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com)
- A [football-data.org API key](https://www.football-data.org/client/register) (free)

### Setup

**1. Clone the repo**
```bash
git clone https://github.com/maheshdivan/fifa-2026-predictor.git
cd fifa-2026-predictor
```

**2. Configure environment variables**
```bash
cp .env.example backend/.env
# Edit backend/.env and add your API keys
```

**3. Start both servers with one command**
```bash
bash start.sh
```

Or manually in two terminals:

```bash
# Terminal 1 — Backend (http://localhost:8000)
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

**4. Open the app**

Visit **http://localhost:5173**, paste the Wikipedia URL, and click **Predict the Tournament**.

---

## Deployment

### Backend → Render

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Set these environment variables in Render:

```
ANTHROPIC_API_KEY=your_key
FOOTBALL_DATA_API_KEY=your_key
ALLOWED_ORIGINS=https://your-app.vercel.app
```

### Frontend → Vercel

Set Root Directory to `frontend` and add this environment variable:

```
VITE_API_URL=https://your-backend.onrender.com/api
```

---

## Features

- **Live SSE streaming** — see each pipeline step as it completes
- **Parallel quiz** — 10 timed FIFA trivia questions while predictions run
- **Edit mode** — reorder group teams with ↑↓ arrows, flip knockout winners by clicking
- **Override banner** — tracks your changes with a count badge
- **Confirmation modal** — shows a full diff of your changes before re-predicting
- **AI reasoning** — click any match card to read Claude's analysis
- **Champion reveal** — animated banner with Claude's reasoning for the winner

---

## Project Structure

```
fifa-2026-predictor/
├── backend/
│   ├── main.py                    # FastAPI app + SSE endpoint
│   ├── requirements.txt
│   └── agents/
│       ├── wiki_agent.py          # Parses Wikipedia WC page
│       ├── football_data_agent.py # Fetches league data
│       ├── prediction_agent.py    # Claude tournament simulation
│       └── quiz_agent.py          # Claude trivia generator
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main app + state management
│   │   ├── api/client.ts          # SSE streaming client
│   │   ├── types/index.ts         # TypeScript interfaces
│   │   └── components/
│   │       ├── UrlInput.tsx       # Landing page
│   │       ├── QuizPanel.tsx      # Timed trivia quiz
│   │       ├── ProgressStream.tsx # Live analysis feed
│   │       ├── GroupStageResults.tsx  # 12 group cards + edit mode
│   │       ├── TournamentBracket.tsx  # Knockout bracket + edit mode
│   │       ├── OverridesBanner.tsx    # Change count + apply CTA
│   │       └── ConfirmModal.tsx       # Change diff + confirm
│   └── vercel.json
├── render.yaml
└── start.sh
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/predict/stream?wiki_url=...` | SSE stream — runs full prediction pipeline |
| `GET` | `/api/predict/stream?wiki_url=...&overrides=...` | SSE stream — re-predicts with user overrides |
| `GET` | `/api/quiz` | Returns 10 FIFA trivia questions |
| `GET` | `/api/health` | Health check + API key status |

---

## License

MIT
