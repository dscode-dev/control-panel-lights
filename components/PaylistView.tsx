"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SimulatedVU from "./SimulatedVU";
import { PlaylistStep } from "../types/playlist";
import { UiMode } from "../utils/uiMode";
import Button from "./Button";
import type { WsClient } from "@/services/socket";

interface Props {
  steps: PlaylistStep[];
  activeIndex: number;
  mode: UiMode;

  onAdd: () => void;
  onEdit: (stepId: string) => void;
  onDelete: (stepId: string) => void;
  onPlayStep: (stepId: string) => void;
  onSelectStep?: (stepId: string) => void;

  getProgress: (index: number) => number;

  audioStepId: string | null;
  audioShouldPlay: boolean;

  wsClient?: WsClient | null;
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
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
  getProgress,
  audioStepId,
  audioShouldPlay,
  wsClient,
}: Props) {
  const [audioPlaying, setAudioPlaying] = useState(false);

  // ===== AUDIO ANALYSIS (SEM QUEBRAR O SOM) =====
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // ===============================
  // PLAY / PAUSE DO <audio>
  // ===============================
  useEffect(() => {
    if (!audioStepId) return;
    const el = getAudioEl(audioStepId);
    if (!el) return;

    if (audioShouldPlay) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [audioStepId, audioShouldPlay]);

  // ===============================
  // ANALYSER (SOM INTACTO)
  // ===============================
  useEffect(() => {
    const audio = getAudioEl(audioStepId);
    if (!audio || !wsClient || !audioPlaying) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const ctx = audioCtxRef.current;

    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audio);
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.6;

      // ⚠️ CRÍTICO:
      // NÃO conectar ao destination
      sourceRef.current.connect(analyserRef.current);

      dataArrayRef.current = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );
    }

    const analyser = analyserRef.current!;
    const data = dataArrayRef.current!;

    const tick = () => {
      if (!audioPlaying) return;

      analyser.getByteTimeDomainData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }

      const rms = Math.sqrt(sum / data.length);
      const energy = clamp01(rms * 4.0); // mais sensível

      const now = performance.now();
      if (now - lastSentRef.current > 16) {
        lastSentRef.current = now;

        wsClient.send({
          type: "player_audio_frame",
          data: {
            stepIndex: activeIndex,
            elapsedMs: Math.floor(audio.currentTime * 1000),
            energy,
          },
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    ctx.resume().catch(() => {});
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [audioStepId, audioPlaying, wsClient, activeIndex]);

  // ===============================
  // UI
  // ===============================
  const content = useMemo(() => {
    return steps.map((step, index) => {
      const isActive = index === activeIndex;
      const isProcessing = step.status === "processing";
      const isError = step.status === "error";

      const rawProgress =
        typeof step.progress === "number"
          ? step.progress
          : getProgress(index);

      const progress = clamp01(rawProgress);

      return (
        <div
          key={step.id}
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
                  disabled={step.status !== "ready"}
                  onClick={() => onPlayStep(step.id)}
                  className="px-3 py-1.5 border rounded-lg"
                >
                  ▶
                </button>

                <button
                  onClick={() => onDelete(step.id)}
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
                controls
                preload="auto"
                className="w-full"
                onPlay={() => setAudioPlaying(true)}
                onPause={() => setAudioPlaying(false)}
              />

              <SimulatedVU active={audioPlaying} />
            </div>
          )}
        </div>
      );
    });
  }, [steps, activeIndex, mode, audioStepId, audioPlaying]);

  return (
    <section className="rounded-2xl border border-gray-200/70 bg-white shadow-sm">
      {/* HEADER COM ESTILO RESTAURADO */}
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