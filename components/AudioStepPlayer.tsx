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
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible || !audioRef.current) return;

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }

    const ctx = ctxRef.current;
    const audio = audioRef.current;

    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audio);
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 512;

      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(ctx.destination);

      dataRef.current = new Uint8Array(
        analyserRef.current.frequencyBinCount
      );
    }
  }, [visible, stepId]);

  useEffect(() => {
    const audio = audioRef.current;
    const ctx = ctxRef.current;

    if (!audio || !ctx) return;

    if (shouldPlay) {
      ctx.resume().catch(() => {});
      audio.play().catch(() => {});
      loop();
    } else {
      audio.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [shouldPlay]);

  const loop = () => {
    if (!analyserRef.current || !dataRef.current || !wsClient) return;

    const analyser = analyserRef.current;
    const data = dataRef.current;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      analyser.getByteFrequencyData(data);

      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const energy = Math.min(1, sum / (data.length * 255));

      wsClient.send({
        type: "player_audio_frame",
        data: {
          stepIndex,
          elapsedMs: Math.floor(
            (audioRef.current?.currentTime ?? 0) * 1000
          ),
          energy,
        },
      });
    };

    tick();
  };

  if (!visible || !stepId) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white border p-4 rounded-xl">
      <div className="flex justify-between mb-2">
        <strong>Áudio</strong>
        <button onClick={onClose}>Fechar</button>
      </div>

      <audio
        ref={audioRef}
        src={`${process.env.NEXT_PUBLIC_API_URL}/audio/stream/${stepId}`}
        controls
        preload="auto"
        className="w-full"
      />
    </div>
  );
}