// app/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"

import Header from "@/components/Header"
import PlayerControls from "@/components/PlayerControls"
import StatusPanel from "@/components/StatusPanel"
import ESPStatusPanel from "@/components/ESPStatusPanel"
import StepForm from "@/components/StepForm"

import * as api from "@/services/api"
import { connectSocket } from "@/services/socket"

import { usePlaylistStore } from "@/utils/playlistStore"
import type { PlaylistStep } from "@/types/playlist"
import type { UiMode } from "@/utils/uiMode"
import PlaylistView from "@/components/PaylistView"
import YouTubeStepPlayer from "@/components/YoutubeStepPlayer"

const DEBUG = process.env.NEXT_PUBLIC_DEBUG_WS === "1"

function dlog(...args: any[]) {
  if (DEBUG) console.log(...args)
}

type EspNode = any // não mexo nisso aqui pra não quebrar seu componente

function clamp01(x: any) {
  const n = Number(x)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export default function Page() {
  // ✅ STORE (fonte da UI)
  const steps = usePlaylistStore((s) => s.steps)
  const setSteps = usePlaylistStore((s) => s.setSteps)
  const addStep = usePlaylistStore((s) => s.addStep)
  const upsertStep = usePlaylistStore((s) => s.upsertStep)
  const updateStepById = usePlaylistStore((s) => s.updateStepById)
  const removeStep = usePlaylistStore((s) => s.removeStep)

  // UI
  const [mode, setMode] = useState<UiMode>("operator")
  const toggleMode = () =>
    setMode((prev) => (prev === "operator" ? "show" : "operator"))

  const [addOpen, setAddOpen] = useState(false)

  // Player/Status
  const [status, setStatus] = useState<any>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  // ESP
  const [espNodes, setEspNodes] = useState<EspNode[]>([])

  // YouTube
  const [ytVisible, setYtVisible] = useState(false)
  const [ytUrl, setYtUrl] = useState<string | null>(null)
  const [ytShouldPlay, setYtShouldPlay] = useState(false)

  const activeStep = useMemo(() => {
    if (activeIndex < 0) return null
    return steps[activeIndex] ?? null
  }, [steps, activeIndex])

  // 🔁 PROVA: UI renderiza sempre a partir da store
  useEffect(() => {
    dlog(
      "[UI] steps changed:",
      steps.map((s) => ({ id: s.id, st: s.status, p: s.progress }))
    )
  }, [steps])

  // Sync inicial (1x)
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

  // WS — fonte de verdade de progresso
  useEffect(() => {
    const sock = connectSocket({
      onMessage: (msg) => {
        dlog("[WS] EVENT:", msg.type, msg.data)

        const type = msg.type
        const data = msg.data

        switch (type) {
          case "status": {
            setStatus(data)
            if (typeof data?.activeIndex === "number") {
              setActiveIndex(data.activeIndex)
            }
            if (data?.isPlaying === false) {
              setYtShouldPlay(false)
            }
            return
          }

          case "esp": {
            setEspNodes(data?.nodes ?? [])
            return
          }

          // ✅ pipeline
          case "pipeline_started": {
            const stepId = data?.stepId
            if (!stepId) return

            updateStepById(stepId, {
              status: "processing",
              progress: 0,
              pipelineStage: data?.stage ?? "",
            } as any)
            return
          }

          case "pipeline_progress": {
            const stepId = data?.stepId
            if (!stepId) return

            updateStepById(stepId, {
              status: "processing",
              progress: clamp01(data?.progress),
              pipelineStage: data?.stage ?? "",
            } as any)
            return
          }

          case "pipeline_completed": {
            const step = data?.step
            if (step?.id) {
              // 🔥 CRÍTICO: substitui o step inteiro (com bpm/duration/audio/leds/portal etc)
              upsertStep({
                ...step,
                status: "ready",
                progress: 1,
              })
            } else {
              // reconcile pontual (não polling)
              api.getPlaylist().then((p) => setSteps(p.steps)).catch(() => {})
            }
            return
          }

          case "pipeline_failed": {
            const stepId = data?.stepId
            if (!stepId) return
            updateStepById(stepId, {
              status: "error",
              pipelineStage: data?.error ?? "Falha",
            } as any)
            return
          }

          // compat (caso backend mande ainda)
          case "playlist_progress": {
            const stepId = data?.stepId
            if (!stepId) return
            updateStepById(stepId, {
              status: "processing",
              progress: clamp01(data?.progress),
            })
            return
          }

          case "playlist_ready": {
            const step = data?.step
            if (step?.id) {
              upsertStep({ ...step, status: "ready", progress: 1 })
            } else {
              api.getPlaylist().then((p) => setSteps(p.steps)).catch(() => {})
            }
            return
          }

          default:
            return
        }
      },
    })

    return () => sock.close()
  }, [setSteps, updateStepById, upsertStep])

  // helpers
  const findIndexById = (id: string) => steps.findIndex((s) => s.id === id)

  function onSelectStep(stepId: string) {
    const idx = findIndexById(stepId)
    const step = steps[idx]
    if (!step) return

    // só prepara vídeo quando ready + music
    if (step.status === "ready" && step.type === "music" && step.youtubeUrl) {
      setActiveIndex(idx)
      setYtUrl(step.youtubeUrl)
      setYtVisible(true)
      setYtShouldPlay(false)
    }
  }

  async function onPlayStep(stepId: string) {
    const idx = findIndexById(stepId)
    const step = steps[idx]
    if (!step || step.status !== "ready") return

    setActiveIndex(idx)

    if (step.type === "music" && step.youtubeUrl) {
      setYtUrl(step.youtubeUrl)
      setYtVisible(true)
    }

    // backend inicia show
    await api.playStep(idx)

    // frontend inicia vídeo junto (sem clique no iframe)
    if (step.type === "music" && step.youtubeUrl) {
      setYtShouldPlay(true)
    }
  }

  // player global
  const onPlay = async () => {
    await api.play()
  }

  const onPause = async () => {
    setYtShouldPlay(false)
    await api.pausePlayer() // /player/pause
  }

  const onSkip = async () => {
    setYtShouldPlay(false)
    await api.skip()
  }

  async function onDelete(stepId: string) {
    const idx = findIndexById(stepId)
    if (idx < 0) return
    if (!confirm("Remover este step?")) return

    await api.deleteStep(idx)
    removeStep(idx)
  }

  // ✅ add step (mantém como você já vinha fazendo)
  async function handleCreateStep(fd: FormData) {
    setAddOpen(false)

    // aqui você pode ter vários tipos (music/presentation/pause).
    // Vou manter “music from youtube multipart” como estava no seu fluxo atual.
    const payload = new FormData()
    payload.append("title", String(fd.get("title") ?? ""))
    payload.append("palette", String(fd.get("palette") ?? "blue"))
    payload.append("genre", String(fd.get("genre") ?? ""))
    payload.append("youtubeUrl", String(fd.get("youtubeUrl") ?? ""))
    payload.append("useAI", String(Boolean(fd.get("useAI"))))

    const audio = fd.get("audio")
    if (audio instanceof File && audio.size > 0) payload.append("audio", audio)

    const res = await api.addFromYoutubeMultipart(payload) // deve retornar { stepId }
    const stepId = res.stepId

    // step entra imediatamente como processing (UI aparece sem refresh)
    const optimistic: PlaylistStep = {
      id: stepId,
      title: String(fd.get("title") ?? ""),
      type: "music",
      status: "processing",
      progress: 0,
      palette: String(fd.get("palette") ?? "blue") as any,
      genre: String(fd.get("genre") ?? ""),
      durationMs: 0,
      bpm: 0,
      trackTitle: "",
      audioFile: "",
      hologram: "",
      leds: "",
      portal: "",
      youtubeUrl: String(fd.get("youtubeUrl") ?? ""),
      esp: [],
    } as any

    addStep(optimistic)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header mode={mode} onToggleMode={toggleMode} />

      <div className="px-4 pt-4">
        <PlayerControls
          mode={mode}
          isPlaying={Boolean(status?.isPlaying)}
          bpm={status?.bpm ?? 0}
          onPlay={onPlay}
          onPause={onPause}
          onSkip={onSkip}
        />
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex-1">
          <PlaylistView
            steps={steps}
            activeIndex={activeIndex}
            mode={mode}
            onAdd={() => setAddOpen(true)}
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

      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[440px] rounded-2xl bg-white p-5 shadow-xl">
            <StepForm onSubmit={handleCreateStep} />
          </div>
        </div>
      )}

      <YouTubeStepPlayer
        videoUrl={ytUrl}
        visible={ytVisible}
        shouldPlay={ytShouldPlay}
        onClose={() => {
          setYtVisible(false)
          setYtShouldPlay(false)
          setYtUrl(null)
        }}
      />
    </div>
  )
}