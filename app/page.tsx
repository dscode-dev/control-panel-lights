"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Header from "@/components/Header";
import PlayerControls from "@/components/PlayerControls";
import StatusPanel from "@/components/StatusPanel";
import ESPStatusPanel from "@/components/ESPStatusPanel";
import Modal from "@/components/Modal";
import StepForm from "@/components/StepForm";

import * as api from "@/services/api";
import { connectSocket, type WsClient } from "@/services/socket";
import { usePlaylistStore } from "@/utils/playlistStore";

import type { UiMode } from "@/utils/uiMode";
import PlaylistView from "@/components/PaylistView";

function getAudioEl(stepId: string | null) {
  if (!stepId) return null;
  return document.querySelector<HTMLAudioElement>(
    `audio[data-step-id="${stepId}"]`
  );
}

function pauseAudioNow(stepId: string | null) {
  const el = getAudioEl(stepId);
  if (!el) return;
  el.pause();
}

export default function Page() {
  const steps = usePlaylistStore((s) => s.steps);
  const setSteps = usePlaylistStore((s) => s.setSteps);
  const removeStep = usePlaylistStore((s) => s.removeStep);

  const [mode, setMode] = useState<UiMode>("operator");
  const toggleMode = () =>
    setMode((p) => (p === "operator" ? "show" : "operator"));

  const [status, setStatus] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [audioStepId, setAudioStepId] = useState<string | null>(null);
  const [audioShouldPlay, setAudioShouldPlay] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [wsClient, setWsClient] = useState<WsClient | null>(null);

  // 🔐 só permite play real após gesto do usuário
  const userGestureRef = useRef(false);

  const activeStep = useMemo(() => {
    if (activeIndex < 0) return null;
    return steps[activeIndex] ?? null;
  }, [steps, activeIndex]);

  const findIndexById = (id: string) =>
    steps.findIndex((s) => s.id === id);

  // INITIAL LOAD
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

  // WEBSOCKET
  useEffect(() => {
    const sock = connectSocket({
      onOpen: () => setWsClient(sock),
      onClose: () => setWsClient(null),
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
            const stepId = step?.id ?? null;

            if (stepId && stepId !== audioStepId) {
              setAudioStepId(stepId);
            }
          }

          if (s?.isPlaying === false) {
            setAudioShouldPlay(false);
            pauseAudioNow(audioStepId);
            userGestureRef.current = false;
          }
        }
      },
    });

    return () => {
      sock.close();
      setWsClient(null);
    };
  }, [setSteps, steps, audioStepId]);

  // ▶ PLAY
  async function onPlayStep(stepId: string) {
    const idx = findIndexById(stepId);
    if (idx < 0) return;

    userGestureRef.current = true;

    setActiveIndex(idx);
    setAudioStepId(stepId);
    setAudioShouldPlay(true);

    await api.playStepByIndex(idx);
  }

  // ⏸ PAUSE
  async function onPause() {
    userGestureRef.current = false;

    pauseAudioNow(audioStepId);
    setAudioShouldPlay(false);

    await api.pausePlayer();
  }

  // ▶ RESUME
  async function onResume() {
    if (!audioStepId) return;

    userGestureRef.current = true;
    setAudioShouldPlay(true);

    await api.resumePlayer();
  }

  // ⏭ SKIP
  async function onSkip() {
    userGestureRef.current = true;

    pauseAudioNow(audioStepId);
    setAudioShouldPlay(false);

    const nextIndex = (() => {
      if (!steps.length) return -1;
      const idx = activeIndex + 1;
      return idx >= steps.length ? 0 : idx;
    })();

    const nextStep = nextIndex >= 0 ? steps[nextIndex] : null;
    const nextId = nextStep?.id ?? null;

    if (nextId) {
      setActiveIndex(nextIndex);
      setAudioStepId(nextId);
      setAudioShouldPlay(true);
    }

    await api.skip();
  }

  // 🗑 DELETE
  async function onDelete(stepId: string) {
    const idx = findIndexById(stepId);
    if (idx < 0) return;

    await api.deleteStep(idx);
    removeStep(idx);

    if (stepId === audioStepId) {
      pauseAudioNow(audioStepId);
      setAudioShouldPlay(false);
      setAudioStepId(null);
      userGestureRef.current = false;
    }
  }

  function openAddModal() {
    setAddModalOpen(true);
  }

  function closeAddModal() {
    if (addLoading) return;
    setAddModalOpen(false);
  }

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
            onAdd={openAddModal}
            onEdit={() => {}}
            onDelete={onDelete}
            onPlayStep={onPlayStep}
            getProgress={(i) => steps[i]?.progress ?? 0}
            audioStepId={audioStepId}
            audioShouldPlay={audioShouldPlay}
            wsClient={wsClient}
          />
        </div>

        <div className="w-[360px] space-y-4">
          <StatusPanel status={status} activeStep={activeStep} />
          <ESPStatusPanel nodes={[]} />
        </div>
      </div>

      <Modal open={addModalOpen} title="Adicionar Step" onClose={closeAddModal}>
        <StepForm onSubmit={submitAddStep} />
      </Modal>
    </div>
  );
}