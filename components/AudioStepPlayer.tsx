"use client";

import { useEffect, useRef } from "react";
import type { WsClient } from "@/services/socket";

interface Props {
  stepId: string | null;
  stepIndex: number;
  visible: boolean;
  shouldPlay: boolean;
  wsClient: WsClient | null;
  onClose: () => void;
}

export default function AudioStepPlayer({
  stepId,
  stepIndex,
  visible,
  shouldPlay,
  wsClient,
  onClose,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  // ===============================
  // PLAY / PAUSE (gesto do usuário deve controlar shouldPlay)
  // ===============================
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (shouldPlay) el.play().catch(() => {});
    else el.pause();
  }, [shouldPlay]);

  // ===============================
  // AUDIO CLOCK → WS (60fps via RAF)
  // ===============================
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !wsClient) return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);

      // envia ~30fps (mais que isso é desperdício)
      const now = performance.now();
      if (now - lastSentRef.current < 33) return;
      lastSentRef.current = now;

      if (!Number.isFinite(audio.currentTime)) return;

      const elapsedMs = Math.floor(audio.currentTime * 1000);

      // energia "mínima" útil: só clock + hint.
      // energia REAL vai vir do AudioContext/Analyser (próximo passo).
      wsClient.send({
        type: "player_audio_frame",
        data: {
          stepIndex,
          elapsedMs,
          energy: 0,
          bands: {},
          beat: false,
        },
      });
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [wsClient, stepIndex]);

  if (!visible || !stepId) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999] rounded-2xl bg-white shadow-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Áudio</div>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>

      <audio
        ref={audioRef}
        src={`${process.env.NEXT_PUBLIC_API_URL}/audio/stream/${stepId}`}
        controls
        className="w-full"
      />
    </div>
  );
}