"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import Header from "@/components/Header"
import PlayerControls from "@/components/PlayerControls"
import StatusPanel from "@/components/StatusPanel"
import ESPStatusPanel from "@/components/ESPStatusPanel"
import PlaylistView from "@/components/PaylistView"
import YouTubeStepPlayer from "@/components/YoutubeStepPlayer"

import * as api from "@/services/api"
import { connectSocket, type WsClient, type WsMessage } from "@/services/socket"
import { usePlaylistStore } from "@/utils/playlistStore"
import { WebAudioAnalyzer } from "@/utils/audioEngine"

import type { UiMode } from "@/utils/uiMode"

export default function Page() {
  const steps = usePlaylistStore((s) => s.steps)
  const setSteps = usePlaylistStore((s) => s.setSteps)
  const updateStepById = usePlaylistStore((s) => s.updateStepById)

  const [mode, setMode] = useState<UiMode>("operator")
  const [status, setStatus] = useState<any>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  const [ytVisible, setYtVisible] = useState(false)
  const [ytUrl, setYtUrl] = useState<string | null>(null)
  const [ytShouldPlay, setYtShouldPlay] = useState(false)

  const wsRef = useRef<WsClient | null>(null)
  const analyzerRef = useRef<WebAudioAnalyzer | null>(null)
  const rafRef = useRef<number | null>(null)

  const activeStep = useMemo(() => {
    if (activeIndex < 0) return null
    return steps[activeIndex] ?? null
  }, [steps, activeIndex])

  // initial sync
  useEffect(() => {
    ;(async () => {
      const playlist = await api.getPlaylist()
      setSteps(playlist.steps)
      const s = await api.getStatus()
      setStatus(s)
      setActiveIndex(s.activeIndex ?? -1)
    })()
  }, [setSteps])

  // websocket
  useEffect(() => {
    const sock = connectSocket({
      onMessage: (msg: WsMessage) => {
        if (msg.type === "status") {
          setStatus(msg.data)
          if (typeof msg.data?.activeIndex === "number") {
            setActiveIndex(msg.data.activeIndex)
          }
        }

        if (msg.type === "playlist_progress") {
          updateStepById(msg.data.stepId, {
            progress: msg.data.progress,
            pipelineStage: msg.data.stage,
          } as any)
        }

        if (msg.type === "playlist") {
          setSteps(msg.data.steps)
        }
      },
    })

    wsRef.current = sock
    return () => sock.close()
  }, [setSteps, updateStepById])

  // 🎯 CLOCK + AUDIO LOOP
  useEffect(() => {
    if (!ytShouldPlay) return
    if (activeIndex < 0) return
    if (!wsRef.current) return
    if (!analyzerRef.current) return

    const ws = wsRef.current
    const analyzer = analyzerRef.current

    const loop = () => {
      const now = performance.now()

      ws.send({
        type: "player_tick",
        data: {
          stepIndex: activeIndex,
          elapsedMs: Math.floor(now),
        },
      })

      const frame = analyzer.readFrame(now)

      ws.send({
        type: "player_audio_frame",
        data: {
          energy: frame.energy,
          bands: frame.bands,
          beat: frame.beat,
        },
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [ytShouldPlay, activeIndex])

  async function onPlayStep(stepId: string) {
    const idx = steps.findIndex((s) => s.id === stepId)
    if (idx < 0) return

    setActiveIndex(idx)

    const step = steps[idx]
    if (step.type === "music" && step.youtubeUrl) {
      setYtUrl(step.youtubeUrl)
      setYtVisible(true)
    }

    await api.playStepByIndex(idx)
    setYtShouldPlay(true)
  }

  async function onPauseButton() {
    await api.pausePlayer()
    setYtShouldPlay(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header mode={mode} onToggleMode={() => {}} />

      <div className="p-4">
        <PlayerControls
          mode={mode}
          isPlaying={Boolean(status?.isPlaying)}
          bpm={status?.bpm ?? 0}
          onPlay={() => {}}
          onPause={onPauseButton}
          onSkip={() => {}}
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
            onDelete={() => {}}
            onPlayStep={onPlayStep}
            getProgress={(i) => steps[i]?.progress ?? 0}
          />
        </div>

        <div className="w-[360px] space-y-4">
          <StatusPanel status={status} activeStep={activeStep} />
          <ESPStatusPanel nodes={[]} />
        </div>
      </div>

      <YouTubeStepPlayer
        videoUrl={ytUrl}
        visible={ytVisible}
        shouldPlay={ytShouldPlay}
        onReady={(analyzer) => {
          analyzerRef.current = analyzer
        }}
        onClose={() => {
          setYtShouldPlay(false)
          setYtVisible(false)
          setYtUrl(null)
        }}
      />
    </div>
  )
}