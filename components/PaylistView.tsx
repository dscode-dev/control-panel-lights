"use client"

import { useEffect, useMemo, useState } from "react"
import Button from "./Button"
import { PlaylistStep } from "../types/playlist"
import { UiMode } from "../utils/uiMode"

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, "0")
  const ss = String(s % 60).padStart(2, "0")
  return `${mm}:${ss}`
}

function pill(text: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-[rgb(var(--border))] bg-white px-2.5 py-1 text-xs text-[rgb(var(--text-muted))]">
      {text}
    </span>
  )
}

export default function PlaylistView({
  steps,
  activeIndex = 0,
  mode,
  onAdd,
  onEdit,
  onDelete,
  onPlayStep,
  progressByIndex,
}: {
  steps: PlaylistStep[]
  activeIndex?: number
  mode: UiMode
  onAdd: () => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onPlayStep: (index: number) => void
  progressByIndex: (index: number) => number
}) {
  const [animatedIndex, setAnimatedIndex] = useState(activeIndex)
  const [expanded, setExpanded] = useState<Set<number>>(new Set([activeIndex]))

  useEffect(() => {
    setAnimatedIndex(activeIndex)
    // auto-expande o step ativo
    setExpanded((prev) => new Set(prev).add(activeIndex))
  }, [activeIndex])

  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const activeStep = steps[activeIndex]
  const paletteClass = activeStep?.palette ? `palette-${activeStep.palette}` : "palette-blue"
  const paletteLabel = useMemo(() => activeStep?.palette || "blue", [activeStep?.palette])

  return (
    <section
      className={`show-panel ${paletteClass} rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm overflow-hidden`}
    >
      {/* Header mais bonito */}
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-[rgb(var(--border))]">
        <div>
          <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
            Playlist • {steps.length} steps
          </div>
          <div className="mt-1 text-xl font-semibold text-[rgb(var(--text-main))]">
            Workflow do show
          </div>
          <div className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Paleta ativa: <span className="font-semibold text-[rgb(var(--text-main))]">{paletteLabel}</span>
          </div>
        </div>

        {mode === "operator" ? (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onAdd}>
              ➕ Adicionar
            </Button>
          </div>
        ) : null}
      </div>

      {/* Lista */}
      <div className={`${mode === "show" ? "p-6" : "p-6"} space-y-4`}>
        {steps.map((step, index) => {
          const isActive = index === activeIndex
          const isExpanded = expanded.has(index)
          const progress = progressByIndex(index)
          const pct = Math.max(0, Math.min(100, Math.round(progress * 100)))

          return (
            <div
              key={step.id}
              className={`
                rounded-2xl border transition-all
                ${isActive ? "border-[rgb(var(--accent))]/35" : "border-[rgb(var(--border))]"}
                ${isActive ? "bg-[rgb(var(--accent-soft))]" : "bg-white"}
                ${index === animatedIndex ? "animate-[step-enter_220ms_ease-out]" : ""}
              `}
            >
              {/* Linha principal (clicável) */}
              <div
                className="flex items-start justify-between gap-4 p-5 cursor-pointer"
                onClick={() => toggleExpand(index)}
                onDoubleClick={() => onPlayStep(index)}
                title="Clique para expandir • Duplo clique para tocar este step"
              >
                <div className="flex min-w-0 items-start gap-4">
                  {/* índice */}
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                    style={{
                      background:
                        isActive
                          ? "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-strong)))"
                          : "linear-gradient(135deg, rgba(15,23,42,0.25), rgba(15,23,42,0.15))",
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* texto */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`truncate font-semibold ${isActive ? "text-[rgb(var(--text-main))]" : "text-[rgb(var(--text-main))]"}`}>
                        {step.title}
                      </div>

                      {/* pulsar Executando */}
                      {isActive ? (
                        <div className="ml-1 inline-flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent))] opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />
                          </span>
                          <span className="text-xs font-semibold text-[rgb(var(--accent))]">
                            Executando
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {pill(step.type.toUpperCase())}
                      {step.genre ? pill(`Gênero: ${step.genre}`) : null}
                      {step.bpm ? pill(`BPM: ${step.bpm}`) : null}
                      {pill(`Duração: ${formatMs(step.durationMs)}`)}
                    </div>
                  </div>
                </div>

                {/* Ações (alinhadas no topo direito, sem sobreposição) */}
                {mode === "operator" ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm text-[rgb(var(--text-main))] hover:bg-[rgb(var(--surface-2))]"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(index)
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(index)
                      }}
                    >
                      🗑 Remover
                    </button>
                    <button
                      className="rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm text-[rgb(var(--accent))] hover:bg-[rgb(var(--surface-2))]"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlayStep(index)
                      }}
                      title="Tocar este step"
                    >
                      ▶
                    </button>
                  </div>
                ) : (
                  <div className="shrink-0 text-sm text-[rgb(var(--text-faint))]">
                    {isExpanded ? "▾" : "▸"}
                  </div>
                )}
              </div>

              {/* Barra de progresso dentro do item */}
              <div className="px-5 pb-4">
                <div className="h-2 w-full rounded-full bg-black/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        "linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent-strong)))",
                      transition: "width 180ms linear",
                    }}
                  />
                </div>
              </div>

              {/* Expansão com detalhes */}
              {isExpanded ? (
                <div className="border-t border-[rgb(var(--border))] bg-white/60 px-5 py-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-[rgb(var(--border))] bg-white p-4">
                      <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
                        Música
                      </div>
                      <div className="mt-2 text-sm text-[rgb(var(--text-main))]">
                        <div><span className="font-semibold">Track:</span> {step.trackTitle || "—"}</div>
                        <div><span className="font-semibold">Arquivo:</span> {step.audioFile || "—"}</div>
                        <div><span className="font-semibold">Gênero:</span> {step.genre || "—"}</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[rgb(var(--border))] bg-white p-4">
                      <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
                        Execução do Show
                      </div>
                      <div className="mt-2 text-sm text-[rgb(var(--text-main))]">
                        <div><span className="font-semibold">Holograma:</span> {step.hologram || "—"}</div>
                        <div><span className="font-semibold">LEDs:</span> {step.leds || "—"}</div>
                        <div><span className="font-semibold">Portal:</span> {step.portal || "—"}</div>
                      </div>
                    </div>

                    <div className="md:col-span-2 rounded-xl border border-[rgb(var(--border))] bg-white p-4">
                      <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
                        Eventos ESP (simulados)
                      </div>
                      <div className="mt-2 space-y-2">
                        {(step.esp || []).length === 0 ? (
                          <div className="text-sm text-[rgb(var(--text-muted))]">Nenhum comando definido.</div>
                        ) : (
                          step.esp!.map((cmd, i) => (
                            <div
                              key={i}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2 text-sm"
                            >
                              <div className="text-[rgb(var(--text-main))]">
                                <span className="font-semibold">{cmd.target}</span> • {cmd.type}
                              </div>
                              <div className="text-[rgb(var(--text-muted))]">
                                {JSON.stringify(cmd.payload)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {mode === "operator" ? (
                      <div className="md:col-span-2 flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => onEdit(index)}>
                          ✏️ Editar este step
                        </Button>
                        <Button variant="primary" onClick={() => onPlayStep(index)}>
                          ▶ Tocar agora
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
