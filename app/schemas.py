from pydantic import BaseModel, Field
from typing import List, Optional

class MoveAnalysis(BaseModel):
    move_number: int
    uci: str  # e.g., "e2e4"
    san: str  # e.g., "e4"
    evaluation: float
    insight: str

class ChessGameRequest(BaseModel):
    pgn: str = Field(..., description="The full PGN string of the chess game")
    depth: Optional[int] = Field(10, ge=5, le=20, description="Stockfish search depth")


class PositionAnalysisRequest(BaseModel):
    fen: str = Field(..., description="The board position in FEN notation")
    depth: Optional[int] = Field(10, ge=5, le=24, description="Requested Stockfish search depth")
    previous_eval: Optional[float] = Field(
        None,
        ge=-20,
        le=20,
        description="Previous evaluation in pawns, used for dynamic insight text",
    )

class ChessGameResponse(BaseModel):
    player_white: str
    player_black: str
    result: str
    total_moves: int
    analysis: List[MoveAnalysis]


class PositionAnalysisResponse(BaseModel):
    fen: str
    evaluation: float
    depth_used: int
    best_move: Optional[str]
    insight: str