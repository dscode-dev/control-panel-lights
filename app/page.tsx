// app/page.tsx
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
  // store
  const steps = usePlaylistStore((s) => s.steps);
  const setSteps = usePlaylistStore((s) => s.setSteps);
  const removeStep = usePlaylistStore((s) => s.removeStep);

  // ui
  const [mode, setMode] = useState<UiMode>("operator");
  const toggleMode = () =>
    setMode((p) => (p === "operator" ? "show" : "operator"));

  // backend status
  const [status, setStatus] = useState<any>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // 🔊 áudio
  const [audioStepId, setAudioStepId] = useState<string | null>(null);
  const [audioShouldPlay, setAudioShouldPlay] = useState(false);

  // ➕ modal add step
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // ws client (pra AudioStepPlayer / frames)
  const [wsClient, setWsClient] = useState<WsClient | null>(null);

  // 🔐 flag: só pode dar play automático local se vier de um gesto do usuário
  const userGestureRef = useRef(false);

  const activeStep = useMemo(() => {
    if (activeIndex < 0) return null;
    return steps[activeIndex] ?? null;
  }, [steps, activeIndex]);

  const findIndexById = (id: string) => steps.findIndex((s) => s.id === id);

  // initial load
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

  // websocket
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

          // Atualiza activeIndex SEM disparar play
          if (typeof s?.activeIndex === "number") {
            setActiveIndex(s.activeIndex);

            const step = steps[s.activeIndex];
            const stepId = step?.id ?? null;

            // só sincroniza o stepId pra UI (mostra card e áudio)
            if (stepId && stepId !== audioStepId) {
              setAudioStepId(stepId);
            }
          }

          // Se backend pausou, pause local também (isso é safe)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSteps, steps, audioStepId]);

  // ▶ play via step (único play do sistema)
  async function onPlayStep(stepId: string) {
    const idx = findIndexById(stepId);
    if (idx < 0) return;

    setActiveIndex(idx);

    // 🔑 gesto do usuário: habilita tocar áudio local
    userGestureRef.current = true;

    setAudioStepId(stepId);
    setAudioShouldPlay(true);
    playAudioNow(stepId);

    await api.playStepByIndex(idx);
  }

  // ⏸ pause (backend + local)
  async function onPause() {
    userGestureRef.current = false;

    pauseAudioNow(audioStepId);
    setAudioShouldPlay(false);

    await api.pausePlayer();
  }

  // ▶ resume (backend + local) — só se houve gesto do usuário
  async function onResume() {
    if (!audioStepId) return;

    userGestureRef.current = true;

    setAudioShouldPlay(true);
    playAudioNow(audioStepId);

    await api.resumePlayer();
  }

  // ⏭ skip (gesto do usuário) — define próximo step local ANTES do backend
  async function onSkip() {
    userGestureRef.current = true;

    // para o atual local
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
      playAudioNow(nextId);
    }

    // backend vai avançar e emitir status via WS (sincroniza leds)
    await api.skip();
  }

  // 🗑 delete
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

  // ➕ modal handlers
  function openAddModal() {
    setAddModalOpen(true);
  }

  function closeAddModal() {
    if (addLoading) return;
    setAddModalOpen(false);
  }

  // ✅ SUBMIT DO STEPFORM (FormData)
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
            // 👇 passa wsClient se quiser usar AudioStepPlayer separado depois
            wsClient={wsClient}
          />
        </div>

        <div className="w-[360px] space-y-4">
          <StatusPanel status={status} activeStep={activeStep} />
          <ESPStatusPanel nodes={[]} />
        </div>
      </div>

      {/* ✅ MODAL COM STEPFORM */}
      <Modal open={addModalOpen} title="Adicionar Step" onClose={closeAddModal}>
        <StepForm onSubmit={submitAddStep} />
      </Modal>
    </div>
  );
}