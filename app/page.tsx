"use client";

import { useEffect, useMemo, useState } from "react";

import Header from "@/components/Header";
import PlayerControls from "@/components/PlayerControls";
import StatusPanel from "@/components/StatusPanel";
import ESPStatusPanel from "@/components/ESPStatusPanel";
import Modal from "@/components/Modal";
import StepForm from "@/components/StepForm";
import PlaylistView from "@/components/PaylistView";

import * as api from "@/services/api";
import { connectSocket } from "@/services/socket";
import { usePlaylistStore } from "@/utils/playlistStore";

import type { UiMode } from "@/utils/uiMode";

function getAudioEl(stepId: string | null) {
  if (!stepId) return null;
  return document.querySelector<HTMLAudioElement>(
    `audio[data-step-id="${stepId}"]`
  );
}

function playAudioNow(stepId: string | null) {
  if (!stepId) return;
  requestAnimationFrame(() => {
    const el = getAudioEl(stepId);
    if (!el) return;
    el.play().catch(() => {});
  });
}

function pauseAudioNow(stepId: string | null) {
  const el = getAudioEl(stepId);
  if (!el) return;
  el.pause();
}

export default function Page() {
  /* ---------------- store ---------------- */
  const steps = usePlaylistStore((s) => s.steps);
  const setSteps = usePlaylistStore((s) => s.setSteps);
  const removeStep = usePlaylistStore((s) => s.removeStep);

  /* ---------------- ui ---------------- */
  const [mode, setMode] = useState<UiMode>("operator");
  const toggleMode = () =>
    setMode((p) => (p === "operator" ? "show" : "operator"));

  /* ---------------- backend status ---------------- */
  const [status, setStatus] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  /* ---------------- áudio ---------------- */
  const [audioStepId, setAudioStepId] = useState<string | null>(null);
  const [audioShouldPlay, setAudioShouldPlay] = useState(false);

  /* ---------------- modal ---------------- */
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const activeStep = useMemo(() => {
    if (activeIndex < 0) return null;
    return steps[activeIndex] ?? null;
  }, [steps, activeIndex]);

  const findIndexById = (id: string) => steps.findIndex((s) => s.id === id);

  /* ---------------- initial load ---------------- */
  useEffect(() => {
    (async () => {
      const playlist = await api.getPlaylist();
      setSteps(playlist.steps);

      try {
        const s = await api.getStatus();
        setStatus(s);
        if (typeof s.activeIndex === "number") {
          setActiveIndex(s.activeIndex);
        }
      } catch {}
    })();
  }, [setSteps]);

  /* ---------------- websocket ---------------- */
  useEffect(() => {
    const sock = connectSocket({
      onMessage: (msg: any) => {
        if (msg.type === "playlist") {
          setSteps(msg.data?.steps ?? []);
          return;
        }

        if (msg.type === "status") {
          const s = msg.data;
          setStatus(s);

          if (typeof s?.activeIndex === "number") {
            setActiveIndex(s.activeIndex);
            const step = steps[s.activeIndex];
            if (step?.id) setAudioStepId(step.id);
          }

          if (s?.isPlaying === false) {
            setAudioShouldPlay(false);
            pauseAudioNow(audioStepId);
          }
        }
      },
    });

    return () => sock.close();
  }, [setSteps, steps, audioStepId]);

  /* ---------------- PLAY ---------------- */
  async function onPlayStep(stepId: string) {
    const idx = findIndexById(stepId);
    if (idx < 0) return;

    setActiveIndex(idx);
    setAudioStepId(stepId);
    setAudioShouldPlay(true);
    playAudioNow(stepId);

    await api.playStepByIndex(idx);
  }

  /* ---------------- AUTO NEXT (audio ended) ---------------- */
  function handleAudioEnded(stepId: string) {
    const idx = findIndexById(stepId);
    if (idx < 0) return;

    const nextIndex = idx + 1;
    if (nextIndex >= steps.length) return;

    const nextStep = steps[nextIndex];
    if (!nextStep || nextStep.status !== "ready") return;

    pauseAudioNow(audioStepId);
    setAudioShouldPlay(false);

    setActiveIndex(nextIndex);
    setAudioStepId(nextStep.id);
    setAudioShouldPlay(true);

    requestAnimationFrame(() => {
      playAudioNow(nextStep.id);
    });

    api.playStepByIndex(nextIndex).catch(() => {});
  }

  /* ---------------- PAUSE ---------------- */
  async function onPause() {
    pauseAudioNow(audioStepId);
    setAudioShouldPlay(false);
    await api.pausePlayer();
  }

  /* ---------------- RESUME ---------------- */
  async function onResume() {
    if (!audioStepId) return;
    setAudioShouldPlay(true);
    playAudioNow(audioStepId);
    await api.resumePlayer();
  }

  /* ---------------- NEXT (CORRIGIDO) ---------------- */
  async function onSkip() {
    if (!steps.length) return;

    // pausa o atual
    pauseAudioNow(audioStepId);
    setAudioShouldPlay(false);

    // calcula próximo
    const nextIndex = (() => {
      const idx = activeIndex + 1;
      return idx >= steps.length ? 0 : idx;
    })();

    const nextStep = steps[nextIndex];
    if (!nextStep || nextStep.status !== "ready") return;

    // atualiza UI e toca áudio
    setActiveIndex(nextIndex);
    setAudioStepId(nextStep.id);
    setAudioShouldPlay(true);

    requestAnimationFrame(() => {
      playAudioNow(nextStep.id);
    });

    // 🔥 backend NÃO avança sozinho -> precisamos iniciar o executor do próximo step
    await api.playStepByIndex(nextIndex);

    // ⚠️ NÃO chamar api.skip() aqui, senão bagunça index/fluxo
  }

  /* ---------------- DELETE ---------------- */
  async function onDelete(stepId: string) {
    const idx = findIndexById(stepId);
    if (idx < 0) return;

    await api.deleteStep(idx);
    removeStep(idx);

    if (stepId === audioStepId) {
      pauseAudioNow(audioStepId);
      setAudioShouldPlay(false);
      setAudioStepId(null);
    }
  }

  /* ---------------- ADD STEP ---------------- */
  async function submitAddStep(formData: FormData) {
    try {
      setAddLoading(true);

      const title = String(formData.get("title") ?? "").trim();
      const youtubeUrl = String(formData.get("youtubeUrl") ?? "").trim();
      const genre = String(formData.get("genre") ?? "");
      const palette = String(formData.get("palette") ?? "blue");
      const useAi =
        formData.get("useAi") === "on" || formData.get("useAi") === "true";

      if (!title || !youtubeUrl) {
        throw new Error("Título e URL do YouTube são obrigatórios");
      }

      await api.addFromYouTube({
        title,
        youtubeUrl,
        genre,
        palette,
        useAi,
      });

      setAddModalOpen(false);
    } finally {
      setAddLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header mode={mode} onToggleMode={toggleMode} />

      <div className="px-4 pt-4">
        <PlayerControls
          mode={mode}
          isPlaying={Boolean(status?.isPlaying)}
          bpm={status?.bpm ?? 0}
          onPause={onPause}
          onResume={onResume}
          onSkip={onSkip}
        />
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex-1">
          <PlaylistView
            steps={steps}
            activeIndex={activeIndex}
            mode={mode}
            onAdd={() => setAddModalOpen(true)}
            onEdit={() => {}}
            onDelete={onDelete}
            onPlayStep={onPlayStep}
            onAudioEnded={handleAudioEnded}
            getProgress={(i) => steps[i]?.progress ?? 0}
            audioStepId={audioStepId}
            audioShouldPlay={audioShouldPlay}
          />
        </div>

        <div className="w-[360px] space-y-4">
          <StatusPanel status={status} activeStep={activeStep} />
          <ESPStatusPanel nodes={[]} />
        </div>
      </div>

      <Modal
        open={addModalOpen}
        title="Adicionar Step"
        onClose={() => !addLoading && setAddModalOpen(false)}
      >
        <StepForm onSubmit={submitAddStep} />
      </Modal>
    </div>
  );
}