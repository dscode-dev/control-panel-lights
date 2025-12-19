"use client"

import { useEffect, useState } from "react"
import Button from "./Button"
import { PlaylistStep } from "../types/playlist"
import { UiMode } from "../utils/uiMode"

interface Props {
  steps: PlaylistStep[]
  activeIndex: number
  mode: UiMode

  onAdd: () => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  onPlayStep: (index: number) => void

  /** progresso 0..1 por step (normalmente só o ativo), mas pode vir do próprio step.processing */
  getProgress: (index: number) => number
}

function formatMs(ms?: number) {
  if (!ms || ms <= 0) return "—"
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
   * Expansão:
   * - ativo sempre expandido
   * - quando muda o ativo, colapsa os anteriores automaticamente
   */
  const [expanded, setExpanded] = useState<Set<number>>(new Set([activeIndex]))

  useEffect(() => {
    setExpanded(new Set([activeIndex]))
  }, [activeIndex])

  function toggleExpand(index: number) {
    // mantém ativo sempre expandido (clica no ativo não colapsa)
    if (index === activeIndex) return
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-[rgb(var(--border))]">
        <div>
          <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
            Playlist
          </div>
          <div className="mt-1 text-lg font-semibold text-[rgb(var(--text-main))]">
            Workflow do Show
          </div>
          <div className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            {steps.length} steps • duplo clique executa
          </div>
        </div>

        {mode === "operator" ? (
          <Button variant="secondary" onClick={onAdd}>
            ➕ Adicionar Step
          </Button>
        ) : null}
      </div>

      {/* LISTA */}
      <div className="p-4 space-y-3">
        {steps.map((step, index) => {
          const isActive = index === activeIndex
          const isExpanded = expanded.has(index)

          const status = step.status || "ready"
          const isProcessing = status === "processing"
          const isReady = status === "ready"
          const isError = status === "error"

          // progress do item:
          // - se backend colocar step.progress enquanto processing, usa ele
          // - senão usa getProgress (normalmente para o ativo)
          const p =
            typeof step.progress === "number"
              ? step.progress
              : getProgress(index)

          const pct = Math.max(0, Math.min(100, Math.round(p * 100)))

          const canPlay = isReady
          const canEdit = isReady // se quiser permitir editar ainda em processing, mude para true
          const canDelete = true // se quiser bloquear delete em processing, coloque: !isProcessing

          return (
            <div
              key={step.id}
              className={`
                rounded-2xl border transition-all
                ${
                  isProcessing
                    ? "border-dashed border-[rgb(var(--border))] bg-[rgb(var(--surface-2))]"
                    : isActive
                    ? "border-[rgb(var(--accent))]/35 bg-[rgb(var(--accent-soft))]"
                    : isError
                    ? "border-red-200 bg-red-50"
                    : "border-[rgb(var(--border))] bg-white hover:bg-[rgb(var(--surface-2))]"
                }
              `}
            >
              {/* LINHA PRINCIPAL */}
              <div
                className="flex items-start justify-between gap-4 p-4 cursor-pointer"
                onClick={() => toggleExpand(index)}
                onDoubleClick={() => {
                  if (canPlay) onPlayStep(index)
                }}
                title={
                  canPlay
                    ? "Clique para expandir • Duplo clique para executar"
                    : "Aguardando processamento..."
                }
              >
                {/* LEFT */}
                <div className="flex items-start gap-4 min-w-0">
                  {/* índice */}
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white"
                    style={{
                      background:
                        isProcessing
                          ? "linear-gradient(135deg, rgba(15,23,42,0.25), rgba(15,23,42,0.15))"
                          : isActive
                          ? "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-strong)))"
                          : "linear-gradient(135deg, rgba(15,23,42,0.25), rgba(15,23,42,0.15))",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate font-semibold text-[rgb(var(--text-main))]">
                        {step.title}
                      </div>

                      {/* Executando (pulsar) */}
                      {isActive && isReady ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[rgb(var(--accent))] opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />
                          </span>
                          <span className="text-xs font-semibold text-[rgb(var(--accent))]">
                            Executando
                          </span>
                        </div>
                      ) : null}

                      {/* Processing badge */}
                      {isProcessing ? (
                        <span className="text-xs font-semibold text-[rgb(var(--text-muted))]">
                          Processando…
                        </span>
                      ) : null}

                      {/* Error badge */}
                      {isError ? (
                        <span className="text-xs font-semibold text-red-600">
                          Erro
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                      {step.type?.toUpperCase?.() || "—"}
                      {step.genre ? ` • ${step.genre}` : ""}
                      {step.durationMs ? ` • ${formatMs(step.durationMs)}` : ""}
                      {step.bpm ? ` • ${step.bpm} BPM` : ""}
                    </div>
                  </div>
                </div>

                {/* RIGHT: ações */}
                {mode === "operator" ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Play */}
                    <button
                      className={`
                        rounded-xl border px-3 py-2 text-sm
                        ${
                          canPlay
                            ? "border-[rgb(var(--border))] bg-white text-[rgb(var(--accent))] hover:bg-[rgb(var(--surface-2))]"
                            : "border-[rgb(var(--border))] bg-white/60 text-[rgb(var(--text-faint))] cursor-not-allowed"
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (canPlay) onPlayStep(index)
                      }}
                      title={canPlay ? "Executar step" : "Aguardando processamento"}
                    >
                      ▶
                    </button>

                    {/* Edit */}
                    <button
                      className={`
                        rounded-xl border px-3 py-2 text-sm
                        ${
                          canEdit
                            ? "border-[rgb(var(--border))] bg-white text-[rgb(var(--text-main))] hover:bg-[rgb(var(--surface-2))]"
                            : "border-[rgb(var(--border))] bg-white/60 text-[rgb(var(--text-faint))] cursor-not-allowed"
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (canEdit) onEdit(index)
                      }}
                      title={canEdit ? "Editar" : "Indisponível durante processamento"}
                    >
                      ✏️
                    </button>

                    {/* Delete */}
                    <button
                      className={`
                        rounded-xl border px-3 py-2 text-sm
                        ${
                          canDelete
                            ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
                            : "border-[rgb(var(--border))] bg-white/60 text-[rgb(var(--text-faint))] cursor-not-allowed"
                        }
                      `}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (canDelete) onDelete(index)
                      }}
                      title="Remover"
                    >
                      🗑
                    </button>

                    {/* caret */}
                    <div className="ml-1 text-sm text-[rgb(var(--text-faint))]">
                      {isExpanded ? "▾" : "▸"}
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 text-sm text-[rgb(var(--text-faint))]">
                    {isExpanded ? "▾" : "▸"}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {(isProcessing || isActive) && (
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

                  {isProcessing ? (
                    <div className="mt-1 text-xs text-[rgb(var(--text-muted))]">
                      Preparando show… {pct}%
                    </div>
                  ) : null}
                </div>
              )}

              {/* EXPANSÃO SUAVE */}
              <div
                className={`
                  grid transition-all duration-300 ease-in-out
                  ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-[rgb(var(--text-main))]">
                      <div>
                        <span className="font-semibold">Música:</span>{" "}
                        {step.trackTitle || "—"}
                      </div>
                      <div>
                        <span className="font-semibold">Arquivo:</span>{" "}
                        {step.audioFile || "—"}
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

                    {mode === "operator" ? (
                      <div className="mt-4 flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => onEdit(index)}
                          disabled={!canEdit}
                        >
                          Editar Step
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => onPlayStep(index)}
                          disabled={!canPlay}
                        >
                          ▶ Executar Agora
                        </Button>
                      </div>
                    ) : null}
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
