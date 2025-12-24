// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Header from "@/components/Header";
import PlayerControls from "@/components/PlayerControls";
import StatusPanel from "@/components/StatusPanel";
import ESPStatusPanel from "@/components/ESPStatusPanel";

import * as api from "@/services/api";
import { connectSocket, type WsClient } from "@/services/socket";
import { usePlaylistStore } from "@/utils/playlistStore";
import { WebAudioAnalyzer } from "@/utils/audioEngine";

import type { PlaylistStep } from "@/types/playlist";
import type { UiMode } from "@/utils/uiMode";
import PlaylistView from "@/components/PaylistView";
import YouTubeStepPlayer from "@/components/YoutubeStepPlayer";

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_WS === "1";
const dlog = (...a: any[]) => DEBUG && console.log(...a);

type EspNode = any;

function clamp01(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function Page() {
  // store
  const steps = usePlaylistStore((s) => s.steps);
  const setSteps = usePlaylistStore((s) => s.setSteps);
  const addStep = usePlaylistStore((s) => s.addStep);
  const upsertStep = usePlaylistStore((s) => s.upsertStep);
  const updateStepById = usePlaylistStore((s) => s.updateStepById);
  const removeStep = usePlaylistStore((s) => s.removeStep);

  // ui
  const [mode, setMode] = useState<UiMode>("operator");
  const toggleMode = () =>
    setMode((p) => (p === "operator" ? "show" : "operator"));

  // backend status
  const [status, setStatus] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // esp
  const [espNodes, setEspNodes] = useState<EspNode[]>([]);

  // youtube
  const [ytVisible, setYtVisible] = useState(false);
  const [ytUrl, setYtUrl] = useState<string | null>(null);
  const [ytShouldPlay, setYtShouldPlay] = useState(false);

  // audio engine (local)
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<WebAudioAnalyzer | null>(null);
  const wsRef = useRef<WsClient | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const [audioReady, setAudioReady] = useState(false);

  const activeStep = useMemo(() => {
    if (activeIndex < 0) return null;
    return steps[activeIndex] ?? null;
  }, [steps, activeIndex]);

  useEffect(() => {
    dlog(
      "[UI] steps changed:",
      steps.map((s) => ({ id: s.id, st: s.status, p: s.progress }))
    );
  }, [steps]);

  // initial sync
  useEffect(() => {
    (async () => {
      const playlist = await api.getPlaylist();
      setSteps(playlist.steps);

      try {
        const s = await api.getStatus();
        setStatus(s);
        if (typeof s.activeIndex === "number") setActiveIndex(s.activeIndex);
      } catch {}
    })();
  }, [setSteps]);

  // websocket connect (recebe progresso do pipeline + status)
  useEffect(() => {
    const sock = connectSocket({
      onMessage: (msg) => {
        dlog("[WS] EVENT:", msg.type, msg.data);

        const type = msg.type;
        const data = msg.data;

        switch (type) {
          case "status": {
            setStatus(data);
            if (typeof data?.activeIndex === "number")
              setActiveIndex(data.activeIndex);
            if (data?.isPlaying === false) {
              // backend parou → pausa yt e frames
              setYtShouldPlay(false);
              stopFrames();
              pauseLocalAudio();
            }
            return;
          }

          case "esp": {
            setEspNodes(data?.nodes ?? []);
            return;
          }

          // pipeline events
          case "pipeline_started": {
            const stepId = data?.stepId;
            if (!stepId) return;
            updateStepById(stepId, {
              status: "processing",
              progress: 0,
              pipelineStage: data?.stage ?? "",
            } as any);
            return;
          }

          case "pipeline_progress": {
            const stepId = data?.stepId;
            if (!stepId) return;
            updateStepById(stepId, {
              status: "processing",
              progress: clamp01(data?.progress),
              pipelineStage: data?.stage ?? "",
            } as any);
            return;
          }

          case "pipeline_completed": {
            const step = data?.step;
            if (step?.id) {
              upsertStep({ ...step, status: "ready", progress: 1 });
            } else {
              api
                .getPlaylist()
                .then((p) => setSteps(p.steps))
                .catch(() => {});
            }
            return;
          }

          case "pipeline_failed": {
            const stepId = data?.stepId;
            if (!stepId) return;
            updateStepById(stepId, {
              status: "error",
              pipelineStage: data?.error ?? "Falha",
            } as any);
            return;
          }

          // compat antigos
          case "playlist_progress": {
            const stepId = data?.stepId;
            if (!stepId) return;
            updateStepById(stepId, {
              status: "processing",
              progress: clamp01(data?.progress),
            });
            return;
          }

          case "playlist_ready": {
            const step = data?.step;
            if (step?.id) upsertStep({ ...step, status: "ready", progress: 1 });
            return;
          }

          default:
            return;
        }
      },
      onOpen: () => dlog("[WS] open"),
      onClose: () => dlog("[WS] close"),
    });

    wsRef.current = sock;
    return () => sock.close();
  }, [setSteps, updateStepById, upsertStep]);

  // create hidden audio element once
  useEffect(() => {
    const el = document.createElement("audio");
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    el.muted = true; // ✅ não toca no usuário (YouTube é o áudio “real”)
    el.volume = 0;
    el.style.display = "none";
    document.body.appendChild(el);
    audioElRef.current = el;

    const analyzer = new WebAudioAnalyzer();
    analyzerRef.current = analyzer;

    const onCanPlay = () => setAudioReady(true);
    el.addEventListener("canplay", onCanPlay);

    return () => {
      el.removeEventListener("canplay", onCanPlay);
      try {
        el.pause();
      } catch {}
      el.remove();
      analyzer.close();
      analyzerRef.current = null;
      audioElRef.current = null;
    };
  }, []);

  const findIndexById = (id: string) => steps.findIndex((s) => s.id === id);

  function onSelectStep(stepId: string) {
    const idx = findIndexById(stepId);
    const step = steps[idx];
    if (!step) return;

    setActiveIndex(idx);

    if (step.status === "ready" && step.type === "music" && step.youtubeUrl) {
      setYtUrl(step.youtubeUrl);
      setYtVisible(true);
      setYtShouldPlay(false); // prepara, mas não toca
    }
  }

  function buildAudioUrl(step: PlaylistStep): string | null {
    // step.audioFile vindo do backend após pipeline
    // pode ser URL absoluta ou path. Se for path, prefixa com API_BASE_URL.
    const file = (step as any).audioFile as string | undefined;
    if (!file) return null;
    if (file.startsWith("http://") || file.startsWith("https://")) return file;
    const base = (
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
    ).replace(/\/$/, "");
    return `${base}${file.startsWith("/") ? "" : "/"}${file}`;
  }

  async function startLocalAudio(step: PlaylistStep) {
    const el = audioElRef.current;
    const analyzer = analyzerRef.current;
    if (!el || !analyzer) return;

    const audioUrl = buildAudioUrl(step);
    if (!audioUrl) return; // sem arquivo ainda

    // user gesture unlock (precisa ser no clique do play)
    await analyzer.unlock();

    // attach analyser (uma vez)
    try {
      analyzer.attachToAudioElement(el);
    } catch {}

    // troca source
    if (el.src !== audioUrl) {
      setAudioReady(false);
      el.src = audioUrl;
      el.load();
    }

    // play (mutado)
    try {
      await el.play();
    } catch {
      // autoplay restriction: como isso ocorre dentro do click do step, geralmente destrava.
    }
  }

  function pauseLocalAudio() {
    const el = audioElRef.current;
    if (!el) return;
    try {
      el.pause();
    } catch {}
  }

  function stopLocalAudio() {
    const el = audioElRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {}
  }

  function startFrames(stepId: string) {
    stopFrames();

    // 30Hz
    const intervalMs = 33;
    frameTimerRef.current = window.setInterval(() => {
      const analyzer = analyzerRef.current;
      const ws = wsRef.current;
      if (!analyzer || !ws) return;

      const frame = analyzer.readFrame(Date.now() / 1000);

      const msg = {
        type: "music_frame",
        data: {
          ts: frame.ts,
          stepId,
          energy: frame.energy,
          bands: frame.bands,
          beat: frame.beat,
        },
      };

      ws.send(msg);
    }, intervalMs);
  }

  function stopFrames() {
    if (frameTimerRef.current) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  }

  // ▶ PLAY step (ready): inicia YT + audio local + frames e chama backend
  async function onPlayStep(stepId: string) {
    const idx = findIndexById(stepId);
    const step = steps[idx];
    if (!step || step.status !== "ready") return;

    setActiveIndex(idx);

    // prepara box do youtube (NÃO toca ainda)
    if (step.type === "music" && step.youtubeUrl) {
      setYtUrl(step.youtubeUrl);
      setYtVisible(true);
    }

    /**
     * ⚠️ USER GESTURE CRÍTICO
     * Nada de await antes de iniciar TODA a mídia
     */

    // 1️⃣ destrava AudioContext + prepara analyser (SEM await)
    startLocalAudio(step);

    // 2️⃣ inicia YouTube imediatamente (gesto válido)
    if (step.type === "music" && step.youtubeUrl) {
      setYtShouldPlay(true);
    }

    // 3️⃣ agora sim: manda backend iniciar o executor
    try {
      await api.playStepByIndex(idx);
    } catch (e) {
      // se backend falhar, interrompe tudo
      stopLocalAudio();
      stopFrames();
      setYtShouldPlay(false);
      return;
    }

    // 4️⃣ backend confirmado → inicia envio de frames (~30Hz)
    startFrames(step.id);
  }

  // ⏸ Pause: pausa vídeo + pausa áudio local + para frames + chama backend
  async function onPause() {
    setYtShouldPlay(false);
    pauseLocalAudio();
    stopFrames();
    await api.pausePlayer();
  }

  // ▶ Resume: retoma vídeo + retoma áudio local + retoma frames + chama backend
  async function onResume() {
    const step = activeStep;
    if (!step) return;

    // retoma audio local
    await startLocalAudio(step);
    startFrames(step.id);

    // retoma yt
    if (step.type === "music" && step.youtubeUrl) setYtShouldPlay(true);

    await api.resumePlayer();
  }

  // ⏹ Stop: para tudo + chama backend
  async function onStop() {
    setYtShouldPlay(false);
    setYtVisible(false);
    stopLocalAudio();
    stopFrames();
    await api.stopPlayer();
  }

  async function onSkip() {
    setYtShouldPlay(false);
    stopFrames();
    stopLocalAudio();
    await api.skip();
  }

  async function onDelete(stepId: string) {
    const idx = findIndexById(stepId);
    if (idx < 0) return;
    if (!confirm("Remover este step?")) return;
    await api.deleteStep(idx);
    removeStep(idx);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header mode={mode} onToggleMode={toggleMode} />

      <div className="px-4 pt-4">
        <PlayerControls
          mode={mode}
          isPlaying={Boolean(status?.isPlaying)}
          bpm={status?.bpm ?? 0}
          onPlay={() => api.play()}
          onPause={onPause}
          onSkip={onSkip}
          // se seu PlayerControls tiver resume/stop, use:
          // onResume={onResume}
          // onStop={onStop}
        />
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex-1">
          <PlaylistView
            steps={steps}
            activeIndex={activeIndex}
            mode={mode}
            onAdd={() => {}}
            onEdit={() => {}}
            onDelete={onDelete}
            onPlayStep={onPlayStep}
            onSelectStep={onSelectStep}
            getProgress={(i) => steps[i]?.progress ?? 0}
          />
        </div>

        <div className="w-[360px] space-y-4">
          <StatusPanel status={status} activeStep={activeStep} />
          <ESPStatusPanel nodes={espNodes as any} />
        </div>
      </div>

      <YouTubeStepPlayer
        videoUrl={ytUrl}
        visible={ytVisible}
        shouldPlay={ytShouldPlay}
        onClose={() => {
          setYtShouldPlay(false);
          setYtVisible(false);
          setYtUrl(null);
        }}
      />
    </div>
  );
}
