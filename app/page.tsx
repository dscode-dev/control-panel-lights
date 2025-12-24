// app/page.tsx
"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import Header from "@/components/Header"
import PlayerControls from "@/components/PlayerControls"
import StatusPanel from "@/components/StatusPanel"
import ESPStatusPanel from "@/components/ESPStatusPanel"

import * as api from "@/services/api"
import { connectSocket, type WsClient, type WsMessage } from "@/services/socket"
import { usePlaylistStore } from "@/utils/playlistStore"

import type { PlaylistStep } from "@/types/playlist"
import type { UiMode } from "@/utils/uiMode"
import PlaylistView from "@/components/PaylistView"
import YouTubeStepPlayer from "@/components/YoutubeStepPlayer"

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_WS === "1"
const dlog = (...a: any[]) => DEBUG && console.log(...a)

function clamp01(x: any) {
  const n = Number(x)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

type EspNode = any

export default function Page() {
  // store
  const steps = usePlaylistStore((s) => s.steps)
  const setSteps = usePlaylistStore((s) => s.setSteps)
  const upsertStep = usePlaylistStore((s) => s.upsertStep)
  const updateStepById = usePlaylistStore((s) => s.updateStepById)
  const removeStep = usePlaylistStore((s) => s.removeStep)

  // ui
  const [mode, setMode] = useState<UiMode>("operator")
  const toggleMode = () =>
    setMode((p) => (p === "operator" ? "show" : "operator"))

  // backend status
  const [status, setStatus] = useState<any>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  // esp
  const [espNodes, setEspNodes] = useState<EspNode[]>([])

  // youtube
  const [ytVisible, setYtVisible] = useState(false)
  const [ytUrl, setYtUrl] = useState<string | null>(null)
  const [ytShouldPlay, setYtShouldPlay] = useState(false)

  const wsRef = useRef<WsClient | null>(null)

  const activeStep = useMemo(() => {
    if (activeIndex < 0) return null
    return steps[activeIndex] ?? null
  }, [steps, activeIndex])

  const findIndexById = (id: string) => steps.findIndex((s) => s.id === id)

  // initial sync
  useEffect(() => {
    ;(async () => {
      const playlist = await api.getPlaylist()
      setSteps(playlist.steps)

      try {
        const s = await api.getStatus()
        setStatus(s)
        if (typeof s.activeIndex === "number") setActiveIndex(s.activeIndex)
      } catch {}
    })()
  }, [setSteps])

  // websocket (NOVO CONTRATO)
  useEffect(() => {
    const sock = connectSocket({
      onMessage: (msg: WsMessage) => {
        const type = msg.type
        const data = msg.data

        dlog("[WS]", type, data)

        switch (type) {
          case "status": {
            // fonte oficial do play/pause UI
            setStatus(data)
            if (typeof data?.activeIndex === "number") setActiveIndex(data.activeIndex)

            // Se backend parou, pausa youtube também
            if (data?.isPlaying === false) setYtShouldPlay(false)
            return
          }

          case "esp": {
            setEspNodes(data?.nodes ?? [])
            return
          }

          // ✅ progresso real do pipeline
          case "playlist_progress": {
            const stepId = data?.stepId
            if (!stepId) return
            updateStepById(stepId, {
              progress: clamp01(data?.progress),
              pipelineStage: data?.stage ?? "",
            } as any)
            return
          }

          // ✅ snapshot final: substitui lista inteira
          case "playlist": {
            const stepsSnap = data?.steps
            if (Array.isArray(stepsSnap)) {
              setSteps(stepsSnap)
            }
            return
          }

          case "playlist_error": {
            const stepId = data?.stepId
            if (!stepId) return
            updateStepById(stepId, {
              status: "error",
              pipelineStage: data?.error ?? "Erro",
            } as any)
            return
          }

          default:
            return
        }
      },
      onOpen: () => dlog("[WS] open"),
      onClose: () => dlog("[WS] close"),
    })

    wsRef.current = sock
    return () => sock.close()
  }, [setSteps, updateStepById])

  // -----------------------------
  // UX: selecionar step ready mostra player (preparado)
  // -----------------------------
  function onSelectStep(stepId: string) {
    const idx = findIndexById(stepId)
    const step = steps[idx]
    if (!step) return

    setActiveIndex(idx)

    // ✅ Se ready + music: só mostra player, NÃO toca
    if (step.status === "ready" && step.type === "music" && (step as any).youtubeUrl) {
      setYtUrl((step as any).youtubeUrl)
      setYtVisible(true)
      setYtShouldPlay(false)
    }
  }

  // -----------------------------
  // ✅ PLAY DO STEP (SINCRONIZADO)
  // 1) await backend /player/play/{index}
  // 2) youtube playVideo()
  // -----------------------------
  async function onPlayStep(stepId: string) {
    const idx = findIndexById(stepId)
    const step = steps[idx]
    if (!step || step.status !== "ready") return

    setActiveIndex(idx)

    // prepara box do youtube (visível antes do play)
    if (step.type === "music" && (step as any).youtubeUrl) {
      setYtUrl((step as any).youtubeUrl)
      setYtVisible(true)
    }

    // 1️⃣ backend começa LEDs (executor usa tempo)
    await api.playStepByIndex(idx)

    // 2️⃣ frontend começa YouTube (áudio/vídeo real)
    if (step.type === "music" && (step as any).youtubeUrl) {
      setYtShouldPlay(true)
    }
  }

  // -----------------------------
  // ✅ PlayerControls (só Play/Pause/Skip)
  // - Play: se já tem activeStep, tenta resume primeiro; se falhar, toca o step ativo por index
  // - Pause: backend + YouTube juntos
  // - Skip: backend skip + parar YouTube
  // -----------------------------
  async function onPlayButton() {
    // se já está tocando, não faz nada
    if (status?.isPlaying === true) return

    // se tem step ativo selecionado, tenta resume; se não existir resume no estado, ele ainda funciona
    try {
      await api.resumePlayer()
      setYtShouldPlay(true)
      return
    } catch {}

    // fallback: se não deu resume, recomeça o step atual (por index)
    if (!activeStep) return
    await onPlayStep(activeStep.id)
  }

  async function onPauseButton() {
    // 1) backend pausa executor
    await api.pausePlayer()
    // 2) frontend pausa youtube
    setYtShouldPlay(false)
  }

  async function onSkipButton() {
    // 1) backend skip
    await api.skip()
    // 2) frontend para youtube
    setYtShouldPlay(false)
  }

  async function onDelete(stepId: string) {
    const idx = findIndexById(stepId)
    if (idx < 0) return
    if (!confirm("Remover este step?")) return

    await api.deleteStep(idx)
    removeStep(idx)

    // se deletou o ativo, fecha player
    if (idx === activeIndex) {
      setYtShouldPlay(false)
      setYtVisible(false)
      setYtUrl(null)
      setActiveIndex(-1)
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
          onPlay={onPlayButton}
          onPause={onPauseButton}
          onSkip={onSkipButton}
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
          setYtShouldPlay(false)
          setYtVisible(false)
          setYtUrl(null)
        }}
      />
    </div>
  )
}