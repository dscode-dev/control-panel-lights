"use client"

import { useEffect, useState } from "react"
import Button from "./Button"
import { PlaylistStep } from "../types/playlist"
import { UiMode } from "../utils/uiMode"

interface Props {
  steps: PlaylistStep[]
  activeIndex: number
  mode: UiMode

  /** callbacks reais (backend) */
  onAdd: () => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onPlayStep: (index: number) => void

  /** progresso 0..1 por step */
  getProgress: (index: number) => number
}

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

export default function PlaylistView({
  steps,
  activeIndex,
  mode,
  onAdd,
  onEdit,
  onDelete,
  onPlayStep,
  getProgress,
}: Props) {
  /**
   * Controle de expansão
   * - ativo SEMPRE expandido
   * - steps já executados colapsam automaticamente
   */
  const [expanded, setExpanded] = useState<Set<number>>(new Set([activeIndex]))

  useEffect(() => {
    const next = new Set<number>()
    next.add(activeIndex)
    setExpanded(next)
  }, [activeIndex])

  function toggleExpand(index: number) {
    if (index === activeIndex) return
    setExpanded((prev) => {
      const n = new Set(prev)
      n.has(index) ? n.delete(index) : n.add(index)
      return n
    })
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
        <div>
          <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
            Playlist
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--text-main))]">
            Workflow do Show
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            {steps.length} steps • execução sequencial
          </p>
        </div>

        {mode === "operator" && (
          <Button variant="secondary" onClick={onAdd}>
            ➕ Adicionar Step
          </Button>
        )}
      </div>

      {/* LISTA */}
      <div className="p-4 space-y-3">
        {steps.map((step, index) => {
          const isActive = index === activeIndex
          const isExpanded = expanded.has(index)
          const progress = getProgress(index)
          const pct = Math.round(progress * 100)

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all
                ${
                  isActive
                    ? "border-[rgb(var(--accent))]/40 bg-[rgb(var(--accent-soft))]"
                    : "border-[rgb(var(--border))] bg-white hover:bg-[rgb(var(--surface-2))]"
                }
              `}
            >
              {/* LINHA PRINCIPAL */}
              <div
                className="flex items-start justify-between gap-4 p-4 cursor-pointer"
                onClick={() => toggleExpand(index)}
                onDoubleClick={() => onPlayStep(index)}
                title="Clique para expandir • Duplo clique para executar"
              >
                {/* INFO */}
                <div className="flex items-start gap-4 min-w-0">
                  {/* ÍNDICE */}
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-white shrink-0"
                    style={{
                      background:
                        isActive
                          ? "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-strong)))"
                          : "linear-gradient(135deg, rgba(15,23,42,0.25), rgba(15,23,42,0.15))",
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* TEXTO */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate text-[rgb(var(--text-main))]">
                        {step.title}
                      </span>

                      {/* EXECUTANDO */}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[rgb(var(--accent))]">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent))] opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />
                          </span>
                          Executando
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                      {step.type.toUpperCase()} • {formatMs(step.durationMs)}
                      {step.bpm ? ` • ${step.bpm} BPM` : ""}
                    </div>
                  </div>
                </div>

                {/* AÇÕES */}
                {mode === "operator" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(index)
                      }}
                      className="rounded-lg border border-[rgb(var(--border))] bg-white px-3 py-1.5 text-sm hover:bg-[rgb(var(--surface-2))]"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(index)
                      }}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>

              {/* PROGRESSO */}
              <div className="px-4 pb-3">
                <div className="h-2 w-full rounded-full bg-black/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${pct}%`,
                      background:
                        "linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent-strong)))",
                    }}
                  />
                </div>
              </div>

              {/* EXPANSÃO SUAVE */}
              <div
                className={`
                  grid transition-all duration-300 ease-in-out
                  ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
                `}
              >
                <div
                  className={`
                    overflow-hidden px-4
                    transition-all duration-300 ease-in-out
                    ${isExpanded ? "pb-4 translate-y-0" : "pb-0 -translate-y-1"}
                  `}
                >
                  <div className="rounded-xl border border-[rgb(var(--border))] bg-white p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-semibold">Música:</span>{" "}
                        {step.trackTitle || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Gênero:</span>{" "}
                        {step.genre || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Holograma:</span>{" "}
                        {step.hologram || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">LEDs:</span>{" "}
                        {step.leds || "—"}
                      </div>
                      <div className="md:col-span-2">
                        <span className="font-semibold">Portal:</span>{" "}
                        {step.portal || "—"}
                      </div>
                    </div>

                    {mode === "operator" && (
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => onEdit(index)}
                        >
                          Editar Step
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => onPlayStep(index)}
                        >
                          ▶ Executar Agora
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
