"use client"

import Button from "./Button"
import MiniVU from "./MiniVU"
import { UiMode } from "../utils/uiMode"

export default function PlayerControls({
  mode,
  isPlaying,
  bpm,
  onPlay,
  onPause,
  onSkip,
}: {
  mode: UiMode
  isPlaying: boolean
  bpm: number
  onPlay: () => void
  onPause: () => void
  onSkip: () => void
}) {
  if (mode === "show") return null

  return (
    <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
            Controles
          </div>
          <div className="mt-1 text-lg font-semibold text-[rgb(var(--text-main))]">
            Player do Show
          </div>
          <div className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Ações em tempo real (backend)
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <MiniVU active={isPlaying} bpm={bpm} />
          </div>

          <div className="flex items-center gap-2">
            {isPlaying ? (
              <Button variant="secondary" onClick={onPause}>
                ⏸ Pausar
              </Button>
            ) : (
              <Button variant="primary" onClick={onPlay}>
                ▶ Tocar
              </Button>
            )}
            <Button variant="secondary" onClick={onSkip}>
              ⏭ Pular
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[rgb(var(--border))] px-4 py-3">
        <div className="flex items-center gap-3 text-sm text-[rgb(var(--text-muted))]">
          <span className="inline-flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isPlaying ? "bg-green-500" : "bg-[rgb(var(--text-faint))]"
              }`}
            />
            {isPlaying ? "Executando" : "Pausado"}
          </span>
          <span className="text-[rgb(var(--text-faint))]">•</span>
          <span>
            BPM{" "}
            <span className="font-semibold text-[rgb(var(--text-main))]">
              {bpm}
            </span>
          </span>
        </div>

        <div className="text-xs text-[rgb(var(--text-faint))]">
          Duplo clique no step toca direto
        </div>
      </div>
    </section>
  )
}
