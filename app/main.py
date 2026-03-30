from fastapi import FastAPI, HTTPException
from .schemas import (
    ChessGameRequest,
    ChessGameResponse,
    PositionAnalysisRequest,
    PositionAnalysisResponse,
)
from fastapi.middleware.cors import CORSMiddleware
from .engine import analyze_game_pgn, analyze_position_fen

app = FastAPI(title="Chess Oracle")

# Add this right after app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, you'd restrict this
    allow_methods=["*"],
    allow_headers=["*"],
)

# This handles "GET http://127.0.0.1:8000/"
@app.get("/")
def home():
    return {"status": "Online", "message": "Welcome to Chess Oracle"}

# This handles "POST http://127.0.0.1:8000/analyze-full-game"
@app.post("/analyze-full-game", response_model=ChessGameResponse)
async def post_mortem(request: ChessGameRequest):
    try:
        results = await analyze_game_pgn(request.pgn, request.depth)
        return {
            "player_white": "User",
            "player_black": "Opponent",
            "result": "Completed",
            "total_moves": len(results),
            "analysis": results
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid PGN: {str(e)}")
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Engine setup error: {str(e)}")
    except Exception as e:
        error_text = str(e) or repr(e)
        raise HTTPException(status_code=500, detail=f"Engine Error: {error_text}")


@app.post("/analyze-position", response_model=PositionAnalysisResponse)
async def analyze_position(request: PositionAnalysisRequest):
    try:
        result = await analyze_position_fen(
            fen=request.fen,
            depth=request.depth or 10,
            previous_eval=request.previous_eval,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"Engine setup error: {str(e)}")
    except Exception as e:
        error_text = str(e) or repr(e)
        raise HTTPException(status_code=500, detail=f"Engine Error: {error_text}")