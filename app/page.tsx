"use client"

import { useEffect, useReducer, useRef, useState } from "react"
import Header from "../components/Header"
import PlayerControls from "../components/PlayerControls"
import Button from "../components/Button"

import { UiMode } from "../utils/uiMode"
import { PlaylistStep } from "../types/playlist"
import { PlayerStatus } from "../services/api"
import * as api from "../services/api"
import { connectSocket } from "../services/socket"
import PlaylistView from "@/components/PaylistView"
import StatusPanel from "@/components/StatusPanel"
import EspStatusPanel from "@/components/ESPStatusPanel"
import Modal from "@/components/Modal"
import StepForm from "@/components/StepForm"

/* =======================
   STATE
======================= */

type RuntimeState = {
  playlist: PlaylistStep[]
  status: PlayerStatus
  esp: any[]
  wsConnected: boolean
}

type Action =
  | {
      type: "BOOTSTRAP"
      playlist: PlaylistStep[]
      status: PlayerStatus
      esp: any[]
    }
  | { type: "STATUS"; status: PlayerStatus }
  | { type: "PLAYLIST_PROGRESS"; stepId: string; progress: number }
  | { type: "PLAYLIST_READY"; step: PlaylistStep }
  | { type: "PLAYLIST_ERROR"; stepId: string }
  | { type: "ESP"; nodes: any[] }
  | { type: "WS_CONNECTED"; value: boolean }

const initialState: RuntimeState = {
  playlist: [],
  status: {
    isPlaying: false,
    activeIndex: 0,
    elapsedMs: 0,
    bpm: 0,
    palette: "blue",
    currentTitle: "",
    currentType: "music",
  },
  esp: [],
  wsConnected: false,
}

function reducer(state: RuntimeState, action: Action): RuntimeState {
  switch (action.type) {
    case "BOOTSTRAP":
      return {
        ...state,
        playlist: action.playlist,
        status: action.status,
        esp: action.esp,
      }

    case "STATUS":
      return { ...state, status: action.status }

    case "PLAYLIST_PROGRESS":
      return {
        ...state,
        playlist: state.playlist.map((s) =>
          s.id === action.stepId
            ? { ...s, progress: action.progress }
            : s
        ),
      }

    case "PLAYLIST_READY":
      return {
        ...state,
        playlist: state.playlist.map((s) =>
          s.id === action.step.id ? action.step : s
        ),
      }

    case "PLAYLIST_ERROR":
      return {
        ...state,
        playlist: state.playlist.map((s) =>
          s.id === action.stepId ? { ...s, status: "error" } : s
        ),
      }

    case "ESP":
      return { ...state, esp: action.nodes }

    case "WS_CONNECTED":
      return { ...state, wsConnected: action.value }

    default:
      return state
  }
}

/* =======================
   PAGE
======================= */

export default function Page() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [mode, setMode] = useState<UiMode>("operator")

  const [addOpen, setAddOpen] = useState(false)
  const socketRef = useRef<{ close: () => void } | null>(null)

  /* =======================
     BOOTSTRAP + WS
  ======================= */

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      const [pl, st, esp] = await Promise.all([
        api.getPlaylist(),
        api.getStatus(),
        api.getEspStatus(),
      ])

      if (!mounted) return

      dispatch({
        type: "BOOTSTRAP",
        playlist: pl.steps,
        status: st,
        esp: esp.nodes,
      })
    }

    bootstrap()

    socketRef.current = connectSocket(
      (msg) => {
        switch (msg.type) {
          case "status":
            dispatch({ type: "STATUS", status: msg.data })
            break

          case "playlist_progress":
            dispatch({
              type: "PLAYLIST_PROGRESS",
              stepId: msg.data.stepId,
              progress: msg.data.progress,
            })
            break

          case "playlist_ready":
            dispatch({
              type: "PLAYLIST_READY",
              step: msg.data.step,
            })
            break

          case "playlist_error":
            dispatch({
              type: "PLAYLIST_ERROR",
              stepId: msg.data.stepId,
            })
            break

          case "esp":
            dispatch({ type: "ESP", nodes: msg.data.nodes })
            break
        }
      },
      async () => {
        dispatch({ type: "WS_CONNECTED", value: true })

        // re-sync após reconnect
        const [pl, st, esp] = await Promise.all([
          api.getPlaylist(),
          api.getStatus(),
          api.getEspStatus(),
        ])

        dispatch({
          type: "BOOTSTRAP",
          playlist: pl.steps,
          status: st,
          esp: esp.nodes,
        })
      },
      () => {
        dispatch({ type: "WS_CONNECTED", value: false })
      }
    )

    return () => {
      mounted = false
      socketRef.current?.close()
    }
  }, [])

  /* =======================
     ACTIONS (HTTP only)
  ======================= */

  async function handlePlay() {
    await api.play()
  }

  async function handlePause() {
    await api.pause()
  }

  async function handleSkip() {
    await api.skip()
  }

  async function handlePlayStep(index: number) {
    await api.playStep(index)
  }

  async function handleCreateStep(formData: FormData) {
    setAddOpen(false)

    const type = String(formData.get("type"))

    if (type === "presentation") {
      await api.addPresentation(formData)
      return
    }

    if (type === "music") {
      await api.addStepFromYoutube({
        title: String(formData.get("title")),
        type: "music",
        palette: String(formData.get("palette")),
        genre: String(formData.get("genre") || ""),
        youtubeUrl: String(formData.get("youtubeUrl")),
        useAI: Boolean(formData.get("useAI")),
      })
      return
    }

    if (type === "pause") {
      await api.addPause({
        title: String(formData.get("title")),
        durationMs: Number(formData.get("durationMs") || 3000),
      })
    }
  }

  /* =======================
     DERIVED
  ======================= */

  const { playlist, status, esp, wsConnected } = state
  const activeIndex = Math.max(
    0,
    Math.min(status.activeIndex, playlist.length - 1)
  )
  const currentStep = playlist[activeIndex]

  /* =======================
     RENDER
  ======================= */

  return (
    <main className="min-h-screen relative">
      {/* background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 400px at 20% 0%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(800px 400px at 90% 10%, rgba(124,58,237,0.10), transparent 60%), rgb(var(--bg-main))",
        }}
      />

      <div className="px-4 py-4 space-y-4">
        <Header
          mode={mode}
          onToggleMode={() =>
            setMode((m) => (m === "operator" ? "show" : "operator"))
          }
        />

        {!wsConnected && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
            Conexão em tempo real indisponível. Tentando reconectar…
          </div>
        )}

        <PlayerControls
          mode={mode}
          isPlaying={status.isPlaying}
          bpm={status.bpm}
          onPlay={handlePlay}
          onPause={handlePause}
          onSkip={handleSkip}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <PlaylistView
              steps={playlist}
              activeIndex={activeIndex}
              mode={mode}
              onAdd={() => setAddOpen(true)}
              onEdit={() => {}}
              onDelete={() => {}}
              onPlayStep={handlePlayStep}
              getProgress={() => 0}
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            <StatusPanel
              mode={mode}
              isPlaying={status.isPlaying}
              currentTitle={status.currentTitle}
              currentType={status.currentType}
              bpm={status.bpm}
              progress={
                currentStep?.durationMs
                  ? status.elapsedMs / currentStep.durationMs
                  : 0
              }
              elapsedLabel={`${Math.floor(status.elapsedMs / 1000)}s`}
              totalLabel={`${Math.floor(
                (currentStep?.durationMs || 0) / 1000
              )}s`}
              paletteName={status.palette}
            />

            <EspStatusPanel nodes={esp} />
          </div>
        </div>
      </div>

      {/* ADD STEP */}
      <Modal
        open={addOpen}
        title="Adicionar Step"
        onClose={() => setAddOpen(false)}
      >
        <StepForm onSubmit={handleCreateStep} />
      </Modal>
    </main>
  )
}