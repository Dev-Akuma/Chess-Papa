import chess
import chess.engine
import chess.pgn
import asyncio
import io
import os

# This gets the directory where engine.py lives
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Moves up one level to find the stockfish folder in the root
STOCKFISH_PATH = os.path.join(os.path.dirname(BASE_DIR), "stockfish", "stockfish-windows-x86-64-avx2.exe")

async def analyze_game_pgn(pgn_str: str, depth: int = 10):
    pgn = io.StringIO(pgn_str)
    game = chess.pgn.read_game(pgn)
    if not game:
        return []

    if not os.path.exists(STOCKFISH_PATH):
        raise FileNotFoundError(f"Stockfish binary not found at: {STOCKFISH_PATH}")

    board = game.board()
    
    # Configure Stockfish to be lightweight for 4GB RAM.
    # On some Windows event loop setups, async subprocess can raise NotImplementedError.
    use_async_engine = True
    try:
        transport, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
        await engine.configure({"Threads": 1, "Hash": 16})
    except NotImplementedError:
        use_async_engine = False
        engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        await asyncio.to_thread(engine.configure, {"Threads": 1, "Hash": 16})

    analysis_results = []
    previous_eval = 0.3 # Starting position eval is slightly for white
    try:
        for i, move in enumerate(game.mainline_moves()):
            # Capture SAN before pushing move onto the board.
            try:
                move_san = board.san(move)
            except Exception as move_error:
                raise ValueError(f"Invalid move in PGN at ply {i + 1}: {move_error}")

            board.push(move)

            if use_async_engine:
                info = await engine.analyse(board, chess.engine.Limit(depth=depth))
            else:
                info = await asyncio.to_thread(engine.analyse, board, chess.engine.Limit(depth=depth))
            score = info.get("score")
            if score is None:
                raise ValueError(f"Engine returned no score at ply {i + 1}")

            # Convert score to White perspective in pawn units.
            score_obj = score.white()
            if score_obj.is_mate():
                current_eval = 10.0 if score_obj.mate() > 0 else -10.0
            else:
                cp_score = score_obj.score()
                if cp_score is None:
                    raise ValueError(f"Engine returned an empty centipawn score at ply {i + 1}")
                current_eval = cp_score / 100.0

            eval_diff = current_eval - previous_eval
            is_blunder = abs(eval_diff) > 1.5

            if is_blunder:
                insight = "Blunder detected: major evaluation swing."
            elif abs(eval_diff) > 0.8:
                insight = "Inaccuracy: notable drop in position quality."
            elif abs(eval_diff) > 0.3:
                insight = "Playable move, but there was likely a stronger option."
            else:
                insight = "Solid move."

            analysis_results.append({
                "move_number": i + 1,
                "uci": move.uci(),
                "san": move_san,
                "evaluation": current_eval,
                "insight": insight
            })

            previous_eval = current_eval
    finally:
        try:
            if use_async_engine:
                await engine.quit()
            else:
                await asyncio.to_thread(engine.quit)
        except Exception:
            # Ignore shutdown errors so they don't mask the real analysis error.
            pass

    return analysis_results


async def analyze_position_fen(fen: str, depth: int = 10, previous_eval: float | None = None):
    if not os.path.exists(STOCKFISH_PATH):
        raise FileNotFoundError(f"Stockfish binary not found at: {STOCKFISH_PATH}")

    try:
        board = chess.Board(fen)
    except ValueError as fen_error:
        raise ValueError(f"Invalid FEN: {fen_error}") from fen_error

    use_async_engine = True
    try:
        _, engine = await chess.engine.popen_uci(STOCKFISH_PATH)
        await engine.configure({"Threads": 1, "Hash": 16})
    except NotImplementedError:
        use_async_engine = False
        engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        await asyncio.to_thread(engine.configure, {"Threads": 1, "Hash": 16})

    try:
        if use_async_engine:
            info = await engine.analyse(board, chess.engine.Limit(depth=depth))
        else:
            info = await asyncio.to_thread(engine.analyse, board, chess.engine.Limit(depth=depth))

        score = info.get("score")
        if score is None:
            raise ValueError("Engine returned no score")

        score_obj = score.white()
        if score_obj.is_mate():
            current_eval = 10.0 if score_obj.mate() > 0 else -10.0
        else:
            cp_score = score_obj.score()
            if cp_score is None:
                raise ValueError("Engine returned an empty centipawn score")
            current_eval = cp_score / 100.0

        if previous_eval is None:
            insight = "Fresh position scan complete."
        else:
            eval_diff = current_eval - previous_eval
            if abs(eval_diff) > 1.5:
                insight = "Large swing detected as search deepened."
            elif abs(eval_diff) > 0.8:
                insight = "Position assessment shifted notably with deeper search."
            elif abs(eval_diff) > 0.3:
                insight = "Small evaluation adjustment from additional depth."
            else:
                insight = "Evaluation remains stable at deeper search."

        best_move = None
        pv = info.get("pv") or []
        if pv:
            best_move = pv[0].uci()

        return {
            "fen": board.fen(),
            "evaluation": current_eval,
            "depth_used": depth,
            "best_move": best_move,
            "insight": insight,
        }
    finally:
        try:
            if use_async_engine:
                await engine.quit()
            else:
                await asyncio.to_thread(engine.quit)
        except Exception:
            pass