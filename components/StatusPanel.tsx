"use client"

import { UiMode } from "../utils/uiMode"

export default function StatusPanel({
  mode,
  isPlaying,
  currentTitle,
  currentType,
  bpm,
  progress,
  elapsedLabel,
  totalLabel,
  paletteName,
}: {
  mode: UiMode
  isPlaying: boolean
  currentTitle: string
  currentType: string
  bpm: number
  progress: number // 0..1
  elapsedLabel: string
  totalLabel: string
  paletteName: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)))

  return (
    <aside className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm overflow-hidden">
      {/* topo com destaque */}
      <div
        className="px-5 py-4"
        style={{
          background:
            "linear-gradient(90deg, rgb(var(--accent-soft)), rgba(255,255,255,1))",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
              Status
            </div>
            <div className="mt-1 text-lg font-semibold text-[rgb(var(--text-main))]">
              {isPlaying ? "Executando" : "Pausado"}
            </div>
            <div className="mt-1 text-sm text-[rgb(var(--text-muted))]">
              Paleta: <span className="font-semibold text-[rgb(var(--text-main))]">{paletteName}</span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="text-xs text-[rgb(var(--text-faint))]">BPM</div>
            <div className="text-xl font-semibold text-[rgb(var(--text-main))]">{bpm}</div>
          </div>
        </div>

        {/* progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
            <span>{elapsedLabel}</span>
            <span>{totalLabel}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent-strong)))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
          Step atual
        </div>

        <div className="mt-2 rounded-xl border border-[rgb(var(--border))] bg-white p-4">
          <div className="text-base font-semibold text-[rgb(var(--text-main))]">
            {currentTitle}
          </div>
          <div className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Tipo: <span className="font-semibold text-[rgb(var(--text-main))]">{currentType}</span>
          </div>

          {mode === "operator" ? (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-[rgb(var(--surface-2))] p-3">
                <div className="text-xs text-[rgb(var(--text-faint))]">Execução</div>
                <div className="mt-1 font-semibold text-[rgb(var(--text-main))]">
                  {isPlaying ? "Rodando" : "Parado"}
                </div>
              </div>
              <div className="rounded-lg bg-[rgb(var(--surface-2))] p-3">
                <div className="text-xs text-[rgb(var(--text-faint))]">Progresso</div>
                <div className="mt-1 font-semibold text-[rgb(var(--text-main))]">{pct}%</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
