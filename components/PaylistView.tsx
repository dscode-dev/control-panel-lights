"use client";

import { useEffect, useMemo, useState } from "react";
import SimulatedVU from "./SimulatedVU";
import { PlaylistStep } from "../types/playlist";
import { UiMode } from "../utils/uiMode";
import Button from "./Button";

interface Props {
  steps: PlaylistStep[];
  activeIndex: number;
  mode: UiMode;

  onAdd: () => void;
  onEdit: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onPlayStep: (stepId: string) => void;
  onSelectStep?: (stepId: string) => void;
  onAudioEnded?: (stepId: string) => void; // ✅ NOVO (mínimo)

  getProgress: (index: number) => number;

  audioStepId: string | null;
  audioShouldPlay: boolean;
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function getAudioEl(stepId: string | null) {
  if (!stepId) return null;
  return document.querySelector<HTMLAudioElement>(
    `audio[data-step-id="${stepId}"]`
  );
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
  onAudioEnded, // ✅
  getProgress,
  audioStepId,
  audioShouldPlay,
}: Props) {
  const [audioActuallyPlaying, setAudioActuallyPlaying] = useState(false);

  useEffect(() => {
    if (!audioStepId) return;
    const el = getAudioEl(audioStepId);
    if (!el) return;

    if (audioShouldPlay) {
      requestAnimationFrame(() => {
        const current = getAudioEl(audioStepId);
        if (!current) return;
        current.play().catch(() => {});
      });
    } else {
      el.pause();
    }
  }, [audioStepId, audioShouldPlay]);

  const content = useMemo(() => {
    if (!Array.isArray(steps)) return null;

    return steps.map((step, index) => {
      const isActive = index === activeIndex;
      const isProcessing = step.status === "processing";
      const isReady = step.status === "ready";
      const isError = step.status === "error";

      const rawProgress =
        typeof step.progress === "number" ? step.progress : getProgress(index);

      const progress = clamp01(rawProgress);

      return (
        <div
          key={step.id}
          onClick={() => {
            if (!isReady) return;
            onSelectStep?.(step.id);
          }}
          className={`
            rounded-xl border p-4 transition-all
            ${isActive ? "border-blue-300 bg-blue-50/60" : "border-gray-200"}
            ${isError ? "border-red-300 bg-red-50/60" : ""}
          `}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold truncate text-gray-900">
                {step.title}
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
                    e.stopPropagation();
                    onPlayStep(step.id);
                  }}
                  className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40"
                >
                  ▶
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(step.id);
                  }}
                  className="px-3 py-1.5 border border-red-300 rounded-lg text-sm text-red-600"
                >
                  🗑
                </button>
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="mt-3">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-blue-500 transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {step.id === audioStepId && (
            <div className="mt-4 rounded-xl border bg-white p-3">
              <audio
                data-step-id={step.id}
                src={`${process.env.NEXT_PUBLIC_API_URL}/audio/stream/${step.id}`}
                preload="auto"
                controls
                className="w-full"
                onPlay={() => setAudioActuallyPlaying(true)}
                onPause={() => setAudioActuallyPlaying(false)}
                onEnded={() => onAudioEnded?.(step.id)} // ✅ AQUI
              />
              <SimulatedVU active={audioActuallyPlaying} />
            </div>
          )}
        </div>
      );
    });
  }, [
    steps,
    activeIndex,
    mode,
    onDelete,
    onPlayStep,
    onSelectStep,
    onAudioEnded,
    getProgress,
    audioStepId,
  ]);

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

      <div className="p-4 space-y-3">{content}</div>
    </section>
  );
}