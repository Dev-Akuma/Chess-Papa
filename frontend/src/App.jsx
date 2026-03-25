import React, { useMemo, useState } from 'react'
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

  const initialFen = new Chess().fen()
  const [positions, setPositions] = useState([initialFen])
  const [moveList, setMoveList] = useState([])
  const [currentMove, setCurrentMove] = useState(0)
  const [game, setGame] = useState(new Chess())
  const [isFreePlay, setIsFreePlay] = useState(false)
  const [dropDebug, setDropDebug] = useState('No drop yet')
  const [fenDraft, setFenDraft] = useState(new Chess().fen())

  const currentInsight = useMemo(() => {
    if (!currentMove || analysis.length === 0) {
      return null
    }
    return analysis[currentMove - 1] ?? null
  }, [analysis, currentMove])

  const handleGoToMove = (moveIndex) => {
    const maxIndex = Math.max(positions.length - 1, 0)
    const clamped = Math.min(Math.max(moveIndex, 0), maxIndex)
    setCurrentMove(clamped)
    setIsFreePlay(false)
    setGame(new Chess(positions[clamped] || initialFen))
  }

  const handlePieceDrop = (source, target) => {
    try {
      setDropDebug(`Drop triggered: ${source} -> ${target ?? 'none'}`)

      if (!target) {
        setDropDebug(`Drop cancelled: ${source} -> none`)
        return false
      }

      const newGame = new Chess(game.fen())
      const move = newGame.move({
        from: source,
        to: target,
        promotion: 'q',
      })

      if (!move) {
        setDropDebug(`Illegal move: ${source} -> ${target} (turn ${game.turn()})`)
        return false
      }

      setGame(newGame)
      setIsFreePlay(true)
      setDropDebug(`Move applied: ${source} -> ${target}`)
      return true
    } catch (dropError) {
      const message = dropError instanceof Error ? dropError.message : String(dropError)
      setDropDebug(`Drop error: ${message}`)
      return false
    }
  }

  const handleApplyFen = () => {
    try {
      const nextGame = new Chess(fenDraft.trim())
      setGame(nextGame)
      setDropDebug('Manual FEN applied')
      setIsFreePlay(true)
    } catch (fenError) {
      const message = fenError instanceof Error ? fenError.message : String(fenError)
      setDropDebug(`Invalid FEN: ${message}`)
    }
  }

  const handleForceF2F4 = () => {
    const forced = new Chess(game.fen())
    const move = forced.move({ from: 'f2', to: 'f4', promotion: 'q' })
    if (!move) {
      setDropDebug('Force move failed: f2 -> f4 illegal in current position')
      return
    }
    setGame(forced)
    setDropDebug('Force move applied: f2 -> f4')
    setIsFreePlay(true)
  }

  const handleAnalyze = async () => {
    if (!pgn.trim()) {
      setError('Please paste a PGN first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post('http://127.0.0.1:8000/analyze-full-game', { pgn })
      const backendAnalysis = response.data.analysis ?? []
      setAnalysis(backendAnalysis)

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
    } catch (caughtError) {
      const detail = caughtError?.response?.data?.detail || caughtError.message
      setError(`Analysis failed: ${detail}`)
    }

    setLoading(false)
  }

  const boardFen = game.fen()

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
              arePiecesDraggable={true}
              animationDuration={220}
            />
          </div>

          <div className="mt-5 rounded-xl border border-[#2d5d65] bg-[#15343d]/60 p-4">
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
              <p className="rounded-md border border-[#2d5d65] bg-[#0f232a] px-2 py-1 text-xs text-[#9ec3c6]">
                {dropDebug}
              </p>
            </div>

            <div className="mt-3 rounded-lg border border-[#2d5d65] bg-[#10262d] p-3">
              <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Controlled Position FEN</p>
              <p className="mt-1 break-all text-xs text-[#d2e8e5]">{boardFen}</p>
              <textarea
                value={fenDraft}
                onChange={(event) => setFenDraft(event.target.value)}
                className="mt-2 h-20 w-full rounded-lg border border-[#2d5d65] bg-[#0f232a] p-2 text-xs text-[#e5f4f1] outline-none focus:border-[#f5b971]"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleApplyFen}
                  className="rounded-lg border border-[#2d5d65] bg-[#15343d] px-3 py-1.5 text-xs text-[#e5f4f1] hover:bg-[#1b3d46]"
                >
                  Apply FEN
                </button>
                <button
                  type="button"
                  onClick={handleForceF2F4}
                  className="rounded-lg border border-[#2d5d65] bg-[#15343d] px-3 py-1.5 text-xs text-[#e5f4f1] hover:bg-[#1b3d46]"
                >
                  Force f2 to f4
                </button>
                <button
                  type="button"
                  onClick={() => setFenDraft(boardFen)}
                  className="rounded-lg border border-[#2d5d65] bg-[#15343d] px-3 py-1.5 text-xs text-[#e5f4f1] hover:bg-[#1b3d46]"
                >
                  Load Current FEN
                </button>
              </div>
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
              {currentInsight ? (
                <>
                  <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Current Insight</p>
                  <p className="mt-1 text-base font-semibold text-[#e5f4f1]">
                    Move {currentInsight.move_number}: {currentInsight.san}
                  </p>
                  <p className="mono text-sm text-[#f5b971]">Eval: {currentInsight.evaluation.toFixed(2)}</p>
                  <p className="mt-2 text-sm text-[#d2e8e5]">{currentInsight.insight}</p>
                </>
              ) : (
                <p className="text-sm text-[#9ec3c6]">Use the controller to inspect any move after analysis completes.</p>
              )}
            </div>
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
                    {related && (
                      <span className="mono text-xs text-[#f5b971]">{related.evaluation.toFixed(2)}</span>
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
                {currentInsight ? currentInsight.evaluation.toFixed(2) : '--'}
              </p>
            </div>

            <div>
              <p className="mono text-xs uppercase tracking-widest text-[#9ec3c6]">Stockfish Insight</p>
              <p className="mt-1 text-sm text-[#d9efec]">
                {currentInsight ? currentInsight.insight : 'Run analysis and pick a move to see engine feedback.'}
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