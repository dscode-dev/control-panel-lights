"use client"

import { PlaylistStep } from "../types/playlist"
import { UiMode } from "../utils/uiMode"
import Button from "./Button"

interface Props {
  steps: PlaylistStep[]
  activeIndex: number
  mode: UiMode

  onAdd: () => void
  onEdit: (stepId: string) => void
  onDelete: (stepId: string) => void
  onPlayStep: (stepId: string) => void

  // ✅ opcional: clicar no item (ready/music) prepara o player (visível, pausado)
  onSelectStep?: (stepId: string) => void

  getProgress: (index: number) => number
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

export default function PlaylistView({
  steps,
  activeIndex,
  mode,
  onAdd,
  onEdit,
  onDelete,
  onPlayStep,
  onSelectStep,
  getProgress,
}: Props) {
  return (
    <section className="rounded-2xl border border-gray-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/60">
        <div>
          <div className="text-xs font-semibold tracking-widest uppercase text-gray-500">
            Playlist
          </div>
          <div className="text-lg font-semibold text-gray-900">
            Workflow do Show
          </div>
        </div>

        {mode === "operator" && (
          <Button variant="secondary" onClick={onAdd}>
            ➕ Adicionar Step
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {steps.map((step, index) => {
          const isActive = index === activeIndex
          const isProcessing = step.status === "processing"
          const isReady = step.status === "ready"
          const isError = step.status === "error"

          // ✅ sempre prioriza step.progress (vindo da playlist/store)
          const rawProgress =
            typeof step.progress === "number" ? step.progress : getProgress(index)
          const progress = clamp01(rawProgress)

          const showIndefinite =
            isProcessing && (typeof rawProgress !== "number" || rawProgress <= 0)

          const stageText =
            (step.pipelineStage && step.pipelineStage.trim()) ||
            "Preparando show…"

          return (
            <div
              key={step.id}
              onClick={() => {
                // ✅ regra: step processing não abre vídeo
                if (!isReady) return
                // clicar no step ready deve “preparar” o player (mostrar box pausada)
                onSelectStep?.(step.id)
              }}
              className={`
                rounded-xl border border-gray-200/60 bg-white
                p-4 transition-all
                hover:border-gray-300/80 hover:shadow-sm
                ${isActive ? "border-blue-300 bg-blue-50/60 shadow-sm" : ""}
                ${isError ? "border-red-300 bg-red-50/60" : ""}
              `}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate text-gray-900">
                      {step.title}
                    </span>

                    {isActive && isReady && (
                      <span className="text-xs text-blue-600 animate-pulse">
                        Executando
                      </span>
                    )}

                    {isProcessing && (
                      <span className="text-xs text-gray-500">
                        Processando…
                      </span>
                    )}

                    {isError && (
                      <span className="text-xs text-red-600">
                        Erro
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {step.type.toUpperCase()}
                    {step.genre && ` • ${step.genre}`}
                    {step.bpm ? ` • ${step.bpm} BPM` : ""}
                  </div>
                </div>

                {mode === "operator" && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={!isReady}
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlayStep(step.id)
                      }}
                      className="px-3 py-1.5 border border-gray-300/70 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
                      title="Executar"
                    >
                      ▶
                    </button>

                    <button
                      disabled={!isReady}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(step.id)
                      }}
                      className="px-3 py-1.5 border border-gray-300/70 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
                      title="Editar"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(step.id)
                      }}
                      className="px-3 py-1.5 border border-red-300/70 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
                      title="Remover"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>

              {isProcessing && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    <span>{stageText}</span>
                  </div>

                  {showIndefinite ? (
                    <div className="h-2 w-full bg-gray-200/60 rounded-full overflow-hidden">
                      <div className="h-2 w-1/3 bg-blue-500/70 rounded-full animate-pulse" />
                    </div>
                  ) : (
                    <div className="h-2 w-full bg-gray-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {isReady && (
                <div className="mt-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
                  <div>Música: {step.trackTitle || "—"}</div>
                  <div>Arquivo: {step.audioFile || "—"}</div>
                  <div>Holograma: {step.hologram || "—"}</div>
                  <div>LEDs: {step.leds || "—"}</div>
                  <div className="col-span-2">
                    Portal: {step.portal || "—"}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}