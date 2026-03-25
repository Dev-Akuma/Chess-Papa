# Chess Papa

A full-stack chess analysis app with:
- FastAPI backend for PGN analysis
- Stockfish engine integration
- React frontend with interactive board and timeline controls

## Project Structure

- `app/`: FastAPI backend and analysis logic
- `frontend/`: React + Vite UI
- `stockfish/`: Stockfish source and assets
- `.env`: Local environment values (do not commit real secrets)

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Backend Setup (FastAPI)

1. Create and activate a virtual environment.
2. Install backend dependencies.
3. Ensure the Stockfish binary exists at `stockfish/stockfish-windows-x86-64-avx2.exe`.
4. Run the API:

```powershell
uvicorn app.main:app --reload
```

Backend default URL: `http://127.0.0.1:8000`

## Frontend Setup (React)

From `frontend/`:

```powershell
npm install
npm run dev
```

Frontend default URL is shown by Vite (typically `http://localhost:5173`).

## Environment Variables

1. Copy `.env.example` to `.env` in project root.
2. Fill your local values in `.env`.

Example:

```env
GEMINI_API_KEY=replace_with_your_api_key
STOCKFISH_PATH=stockfish/stockfish-windows-x86-64-avx2.exe
```

Notes:
- The current backend analysis path is resolved in code (`app/engine.py`) and does not require `STOCKFISH_PATH` yet.
- Keep `GEMINI_API_KEY` local-only. Never commit real keys to GitHub.

## API Endpoint

- `POST /analyze-full-game`
  - Body:

```json
{
  "pgn": "1. e4 e5 2. Nf3 Nc6",
  "depth": 10
}
```

Returns move-by-move Stockfish evaluations and insights.

## Publish Checklist

- Remove or rotate any previously exposed API keys.
- Confirm `.env` contains placeholders only.
- Ensure local-only folders like virtual environments are excluded via `.gitignore`.
