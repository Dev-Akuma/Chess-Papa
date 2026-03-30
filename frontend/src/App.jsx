import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import axios from 'axios'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'

function App() {
  const [pgn, setPgn] = useState('')
  const [analysis, setAnalysis] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [liveError, setLiveError] = useState('')
  const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false)

  const [baseDepth, setBaseDepth] = useState(10)
  const [autoDepthEnabled, setAutoDepthEnabled] = useState(true)
  const [maxAutoDepth, setMaxAutoDepth] = useState(22)
  const [liveEval, setLiveEval] = useState(null)
  const [dynamicMoveScores, setDynamicMoveScores] = useState({})

  const initialFen = new Chess().fen()
  const [positions, setPositions] = useState([initialFen])
  const [moveList, setMoveList] = useState([])
  const [currentMove, setCurrentMove] = useState(0)
  const [game, setGame] = useState(new Chess())
  const [isFreePlay, setIsFreePlay] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalTargetSquares, setLegalTargetSquares] = useState([])
  const [checkedKingSquare, setCheckedKingSquare] = useState(null)

  const stableSinceRef = useRef(Date.now())
  const lastFenRef = useRef(initialFen)
  const lastEvalRef = useRef(null)
  const requestIdRef = useRef(0)

  const getDynamicDepth = (elapsedMs) => {
    if (!autoDepthEnabled) {
      return baseDepth
    }

    const elapsedSeconds = elapsedMs / 1000
    const gradualBoost = Math.floor(elapsedSeconds / 6)
    const smoothBoost = Math.floor(Math.sqrt(Math.max(elapsedSeconds, 0) / 2))
    const dynamicDepth = baseDepth + gradualBoost + smoothBoost

    return Math.min(Math.max(dynamicDepth, baseDepth), maxAutoDepth)
  }

  const clearSelectionHighlights = () => {
    setSelectedSquare(null)
    setLegalTargetSquares([])
  }

  const getKingSquare = (boardState, kingColor) => {
    const files = 'abcdefgh'
    const matrix = boardState.board()

    for (let rankIndex = 0; rankIndex < matrix.length; rankIndex += 1) {
      const rank = matrix[rankIndex]
      for (let fileIndex = 0; fileIndex < rank.length; fileIndex += 1) {
        const piece = rank[fileIndex]
        if (piece && piece.type === 'k' && piece.color === kingColor) {
          return `${files[fileIndex]}${8 - rankIndex}`
        }
      }
    }

    return null
  }

  const updateSelectionForSquare = (square) => {
    if (!square) {
      clearSelectionHighlights()
      return
    }

    const piece = game.get(square)
    if (!piece || piece.color !== game.turn()) {
      clearSelectionHighlights()
      return
    }

    const legalMoves = game.moves({ square, verbose: true })
    setSelectedSquare(square)
    setLegalTargetSquares(legalMoves.map((move) => move.to))
  }

  const customSquareStyles = useMemo(() => {
    const styles = {}

    if (selectedSquare) {
      styles[selectedSquare] = {
        background:
          'radial-gradient(circle, rgba(245,185,113,0.58) 10%, rgba(245,185,113,0.26) 55%, rgba(16,38,45,0.32) 100%)',
        boxShadow: 'inset 0 0 0 2px rgba(245,185,113,0.85)',
      }
    }

    legalTargetSquares.forEach((square) => {
      styles[square] = {
        background:
          'radial-gradient(circle, rgba(245,185,113,0.65) 20%, rgba(245,185,113,0.25) 34%, rgba(16,38,45,0.15) 66%, rgba(16,38,45,0.05) 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(245,185,113,0.7)',
      }
    })

    if (checkedKingSquare) {
      styles[checkedKingSquare] = {
        background:
          'radial-gradient(circle, rgba(220,38,38,0.82) 22%, rgba(153,27,27,0.5) 52%, rgba(127,29,29,0.18) 100%)',
        boxShadow: 'inset 0 0 0 2px rgba(254,202,202,0.85)',
      }
    }

    return styles
  }, [selectedSquare, legalTargetSquares, checkedKingSquare])

  const currentInsight = useMemo(() => {
    if (!currentMove || analysis.length === 0) {
      return null
    }
    return analysis[currentMove - 1] ?? null
  }, [analysis, currentMove])

  const effectiveInsight = useMemo(() => {
    if (liveEval && currentInsight) {
      return {
        ...currentInsight,
        evaluation: liveEval.evaluation,
        insight: liveEval.insight,
      }
    }

    if (liveEval && !currentInsight) {
      return {
        move_number: currentMove,
        san: currentMove === 0 ? 'Start position' : 'Current position',
        evaluation: liveEval.evaluation,
        insight: liveEval.insight,
      }
    }

    return currentInsight
  }, [currentInsight, liveEval])

  useEffect(() => {
    if (lastFenRef.current !== game.fen()) {
      lastFenRef.current = game.fen()
      stableSinceRef.current = Date.now()
      lastEvalRef.current = null
      setLiveEval(null)
      setLiveError('')
    }
  }, [game])

  useEffect(() => {
    const kingInCheck =
      (typeof game.inCheck === 'function' && game.inCheck()) ||
      (typeof game.isCheck === 'function' && game.isCheck())

    if (!kingInCheck) {
      setCheckedKingSquare(null)
      return
    }

    setCheckedKingSquare(getKingSquare(game, game.turn()))
  }, [game])

  useEffect(() => {
    let cancelled = false
    let timeoutId = null

    const runLiveAnalysis = async () => {
      const elapsedMs = Date.now() - stableSinceRef.current
      const targetDepth = getDynamicDepth(elapsedMs)
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId

      setIsLiveAnalyzing(true)

      try {
        const response = await axios.post('http://127.0.0.1:8000/analyze-position', {
          fen: game.fen(),
          depth: targetDepth,
          previous_eval: lastEvalRef.current,
        })

        if (cancelled || requestId !== requestIdRef.current) {
          return
        }

        const nextLiveEval = response.data
        lastEvalRef.current = nextLiveEval.evaluation
        setLiveEval(nextLiveEval)
        setLiveError('')

        if (currentMove > 0 && !isFreePlay) {
          setDynamicMoveScores((previous) => ({
            ...previous,
            [currentMove]: {
              evaluation: nextLiveEval.evaluation,
              depth: nextLiveEval.depth_used,
            },
          }))
        }
      } catch (caughtError) {
        if (!cancelled) {
          const detail = caughtError?.response?.data?.detail || caughtError.message
          setLiveError(`Live analysis failed: ${detail}`)
        }
      } finally {
        if (!cancelled) {
          setIsLiveAnalyzing(false)
          timeoutId = window.setTimeout(runLiveAnalysis, autoDepthEnabled ? 1500 : 2200)
        }
      }
    }

    runLiveAnalysis()

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [game, baseDepth, autoDepthEnabled, maxAutoDepth, currentMove, isFreePlay])

  const handleGoToMove = (moveIndex) => {
    const maxIndex = Math.max(positions.length - 1, 0)
    const clamped = Math.min(Math.max(moveIndex, 0), maxIndex)
    setCurrentMove(clamped)
    setIsFreePlay(false)
    setGame(new Chess(positions[clamped] || initialFen))
    clearSelectionHighlights()
  }

  const handleSquareClick = (square) => {
    if (selectedSquare === square) {
      clearSelectionHighlights()
      return
    }

    updateSelectionForSquare(square)
  }

  const handlePieceDragBegin = (_piece, sourceSquare) => {
    updateSelectionForSquare(sourceSquare)
  }

  const handlePieceDrop = (source, target) => {
    try {
      if (!target) {
        return false
      }

      const newGame = new Chess(game.fen())
      const move = newGame.move({
        from: source,
        to: target,
        promotion: 'q',
      })

      if (!move) {
        return false
      }

      setGame(newGame)
      setIsFreePlay(true)
      clearSelectionHighlights()
      return true
    } catch (dropError) {
      return false
    }
  }

  const handleAnalyze = async () => {
    if (!pgn.trim()) {
      setError('Please paste a PGN first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post('http://127.0.0.1:8000/analyze-full-game', { pgn, depth: baseDepth })
      const backendAnalysis = response.data.analysis ?? []
      setAnalysis(backendAnalysis)
      setDynamicMoveScores({})
      setLiveEval(null)
      lastEvalRef.current = null

      const parser = new Chess()
      const navigator = new Chess()
      const nextPositions = [navigator.fen()]
      const nextMoveList = []

      parser.loadPgn(pgn, { strict: false })
      const sanMoves = parser.history()

      if (sanMoves.length > 0) {
        for (let i = 0; i < sanMoves.length; i += 1) {
          const playedMove = navigator.move(sanMoves[i])
          if (!playedMove) {
            throw new Error(`Could not replay SAN move at ply ${i + 1}: ${sanMoves[i]}`)
          }

          nextPositions.push(navigator.fen())
          nextMoveList.push({
            index: i + 1,
            san: playedMove.san,
            color: playedMove.color,
            from: playedMove.from,
            to: playedMove.to,
          })
        }
      } else if (backendAnalysis.length > 0) {
        // Fallback: rebuild timeline from backend UCI moves if SAN history is unavailable.
        for (let i = 0; i < backendAnalysis.length; i += 1) {
          const move = backendAnalysis[i]
          const uci = move?.uci
          if (!uci || uci.length < 4) {
            continue
          }

          const playedMove = navigator.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci.length > 4 ? uci[4] : undefined,
          })

          if (!playedMove) {
            throw new Error(`Could not replay UCI move at ply ${i + 1}: ${uci}`)
          }

          nextPositions.push(navigator.fen())
          nextMoveList.push({
            index: i + 1,
            san: playedMove.san,
            color: playedMove.color,
            from: playedMove.from,
            to: playedMove.to,
          })
        }
      }

      setPositions(nextPositions)
      setMoveList(nextMoveList)
      setCurrentMove(0)
      setIsFreePlay(false)
      setGame(new Chess(nextPositions[0] ?? initialFen))
      clearSelectionHighlights()
    } catch (caughtError) {
      const detail = caughtError?.response?.data?.detail || caughtError.message
      setError(`Analysis failed: ${detail}`)
    }

    setLoading(false)
  }

  const boardFen = game.fen()
  const stableSeconds = Math.floor((Date.now() - stableSinceRef.current) / 1000)
  const currentDynamicDepth = getDynamicDepth(Date.now() - stableSinceRef.current)

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 md:p-8">
      <header className="rounded-2xl border border-[#2d5d65] bg-[#10262d]/70 p-6 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mono text-xs uppercase tracking-[0.3em] text-[#9ec3c6]">Full-Stack Chess Lab</p>
            <h1 className="mt-2 text-3xl font-bold text-[#e5f4f1] md:text-5xl">Stockfish Analysis Console</h1>
            <p className="mt-3 max-w-3xl text-sm text-[#9ec3c6] md:text-base">
              Paste a PGN, run Stockfish analysis, and inspect move-by-move evaluations with timeline controls.
            </p>
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr_420px]">
        <section className="rounded-2xl border border-[#2d5d65] bg-[#10262d]/85 p-4 shadow-[0_16px_42px_rgba(0,0,0,0.35)] md:p-6">
          <div className="mx-auto w-full max-w-[720px]">
            <Chessboard
              position={boardFen}
              onPieceDrop={handlePieceDrop}
              onPieceDragBegin={handlePieceDragBegin}
              onSquareClick={handleSquareClick}
              customSquareStyles={customSquareStyles}
              arePiecesDraggable={true}
              animationDuration={220}
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#2d5d65] bg-[#15343d]/60 p-4">
            <div className="rounded-lg border border-[#2d5d65] bg-[#10262d] p-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Depth Controls</p>
                <label className="flex items-center gap-2 text-xs text-[#d2e8e5]">
                  <input
                    type="checkbox"
                    checked={autoDepthEnabled}
                    onChange={(event) => setAutoDepthEnabled(event.target.checked)}
                    className="accent-[#f5b971]"
                  />
                  Auto depth grow
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-[#9ec3c6]">Base depth: {baseDepth}</p>
                  <input
                    type="range"
                    min={6}
                    max={18}
                    value={baseDepth}
                    onChange={(event) => {
                      const nextBaseDepth = Number(event.target.value)
                      setBaseDepth(nextBaseDepth)
                      if (nextBaseDepth > maxAutoDepth) {
                        setMaxAutoDepth(nextBaseDepth)
                      }
                    }}
                    className="mt-2 w-full accent-[#f5b971]"
                  />
                </div>
                <div>
                  <p className="text-xs text-[#9ec3c6]">Max auto depth: {maxAutoDepth}</p>
                  <input
                    type="range"
                    min={10}
                    max={24}
                    value={maxAutoDepth}
                    onChange={(event) => {
                      const nextMaxDepth = Number(event.target.value)
                      setMaxAutoDepth(Math.max(nextMaxDepth, baseDepth))
                    }}
                    className="mt-2 w-full accent-[#f5b971]"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <p className="rounded-md border border-[#2d5d65] bg-[#0f232a] px-2 py-1 text-[#9ec3c6]">
                  Stable: {stableSeconds}s
                </p>
                <p className="rounded-md border border-[#2d5d65] bg-[#0f232a] px-2 py-1 text-[#f5b971]">
                  Dynamic depth: {currentDynamicDepth}
                </p>
                <p className="rounded-md border border-[#2d5d65] bg-[#0f232a] px-2 py-1 text-[#d2e8e5]">
                  {isLiveAnalyzing ? 'Live eval running...' : 'Live eval idle'}
                </p>
                {liveEval?.best_move && (
                  <p className="rounded-md border border-[#2d5d65] bg-[#0f232a] px-2 py-1 text-[#9ec3c6]">
                    Best move: {liveEval.best_move}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleGoToMove(0)}
                className="rounded-lg border border-[#2d5d65] bg-[#10262d] px-3 py-2 text-[#e5f4f1] transition hover:bg-[#1b3d46]"
                title="First move"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleGoToMove(currentMove - 1)}
                className="rounded-lg border border-[#2d5d65] bg-[#10262d] px-3 py-2 text-[#e5f4f1] transition hover:bg-[#1b3d46]"
                title="Previous move"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleGoToMove(currentMove + 1)}
                className="rounded-lg border border-[#2d5d65] bg-[#10262d] px-3 py-2 text-[#e5f4f1] transition hover:bg-[#1b3d46]"
                title="Next move"
              >
                <ChevronRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleGoToMove(positions.length - 1)}
                className="rounded-lg border border-[#2d5d65] bg-[#10262d] px-3 py-2 text-[#e5f4f1] transition hover:bg-[#1b3d46]"
                title="Last move"
              >
                <ChevronsRight size={16} />
              </button>

              <p className="mono ml-2 text-sm text-[#9ec3c6]">
                Move {currentMove} / {Math.max(positions.length - 1, 0)}
              </p>
              {isFreePlay && (
                <p className="rounded-md border border-[#2d5d65] bg-[#10262d] px-2 py-1 text-xs text-[#f5b971]">
                  Free play mode
                </p>
              )}
              {checkedKingSquare && (
                <p className="rounded-md border border-red-300/60 bg-red-950/60 px-2 py-1 text-xs text-red-100">
                  Check: {game.turn() === 'w' ? 'White' : 'Black'} king on {checkedKingSquare}
                </p>
              )}
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(positions.length - 1, 0)}
              value={currentMove}
              onChange={(event) => handleGoToMove(Number(event.target.value))}
              className="mt-4 w-full accent-[#f5b971]"
            />

            <div className="mt-4 rounded-lg border border-[#2d5d65] bg-[#10262d] p-3">
              {effectiveInsight ? (
                <>
                  <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Current Insight</p>
                  <p className="mt-1 text-base font-semibold text-[#e5f4f1]">
                    Move {effectiveInsight.move_number}: {effectiveInsight.san}
                  </p>
                  <p className="mono text-sm text-[#f5b971]">Eval: {effectiveInsight.evaluation.toFixed(2)}</p>
                  <p className="mt-2 text-sm text-[#d2e8e5]">{effectiveInsight.insight}</p>
                </>
              ) : (
                <p className="text-sm text-[#9ec3c6]">Use the controller to inspect any move after analysis completes.</p>
              )}
            </div>
            {liveError && <p className="mt-3 text-xs text-red-300">{liveError}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-[#2d5d65] bg-[#10262d]/85 p-4 md:p-6">
          <h2 className="text-xl font-bold text-[#e5f4f1]">PGN + Move Feed</h2>

          <textarea
            placeholder="Paste PGN here..."
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            className="mt-3 h-40 w-full rounded-xl border border-[#2d5d65] bg-[#0f232a] p-3 text-sm text-[#e5f4f1] outline-none transition placeholder:text-[#6e979b] focus:border-[#f5b971]"
          />

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-[#f5b971] px-5 py-2.5 font-semibold text-[#222] transition hover:bg-[#eb9f3d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Stockfish is analyzing...' : 'Analyze Full Game'}
          </button>

          {error && (
            <p className="mt-3 rounded-lg border border-red-300/30 bg-red-950/50 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="oracle-scrollbar mt-4 max-h-[440px] space-y-2 overflow-y-auto pr-1">
            {moveList.length === 0 && (
              <p className="text-sm text-[#9ec3c6]">No moves loaded yet.</p>
            )}

            {moveList.map((move) => {
              const related = analysis[move.index - 1]
              const dynamic = dynamicMoveScores[move.index]
              const isActive = move.index === currentMove

              return (
                <button
                  key={move.index}
                  type="button"
                  onClick={() => handleGoToMove(move.index)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    isActive
                      ? 'border-[#f5b971] bg-[#1f3d45]'
                      : 'border-[#2d5d65] bg-[#10262d] hover:bg-[#18343c]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[#e5f4f1]">
                      {move.index}. {move.san}
                    </p>
                    {(dynamic || related) && (
                      <span className="mono text-xs text-[#f5b971]">
                        {(dynamic?.evaluation ?? related?.evaluation ?? 0).toFixed(2)}
                        {dynamic ? ` d${dynamic.depth}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#9ec3c6]">
                    {move.color === 'w' ? 'White' : 'Black'} {move.from} to {move.to}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="rounded-2xl border border-[#2d5d65] bg-[#10262d]/90 p-4 md:p-6">
          <h2 className="text-xl font-bold text-[#e5f4f1]">Engine Notes</h2>
          <p className="mt-2 text-sm text-[#9ec3c6]">
            Stockfish-only mode is active. This panel summarizes the selected move without any LLM assistance.
          </p>

          <div className="mt-4 space-y-3 rounded-xl border border-[#2d5d65] bg-[#0f232a] p-4">
            <div>
              <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Selected Ply</p>
              <p className="mt-1 text-lg font-semibold text-[#e5f4f1]">
                {currentInsight ? `${currentInsight.move_number}. ${currentInsight.san}` : 'No move selected'}
              </p>
            </div>

            <div>
              <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Evaluation</p>
              <p className="mt-1 text-xl font-semibold text-[#f5b971]">
                {effectiveInsight ? effectiveInsight.evaluation.toFixed(2) : '--'}
              </p>
            </div>

            <div>
              <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Stockfish Insight</p>
              <p className="mt-1 text-sm text-[#d9efec]">
                {effectiveInsight ? effectiveInsight.insight : 'Run analysis and pick a move to see engine feedback.'}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#2d5d65] bg-[#10262d] p-3 text-sm text-[#9ec3c6]">
            Tip: Use the timeline slider and move list to review turning points, then switch to Free play mode to test alternatives.
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App