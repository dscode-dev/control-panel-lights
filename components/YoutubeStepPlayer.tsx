"use client"

import { useEffect, useRef, useState } from "react"
import { WebAudioAnalyzer } from "@/utils/audioEngine"
import { WsClient } from "@/services/socket"

type Props = {
  videoUrl: string | null
  visible: boolean
  shouldPlay: boolean
  ws: WsClient | null
  stepIndex: number
  onClose?: () => void
}

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1)
    return u.searchParams.get("v")
  } catch {
    return null
  }
}

export default function YouTubeStepPlayer({
  videoUrl,
  visible,
  shouldPlay,
  ws,
  stepIndex,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<any>(null)

  const analyzerRef = useRef<WebAudioAnalyzer | null>(null)
  const rafRef = useRef<number | null>(null)

  const [ready, setReady] = useState(false)

  const videoId = videoUrl ? extractVideoId(videoUrl) : null

  // =========================
  // Load YouTube API
  // =========================
  useEffect(() => {
    if (window.YT?.Player) return

    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.body.appendChild(tag)
  }, [])

  // =========================
  // Create Player
  // =========================
  useEffect(() => {
    if (!visible || !videoId) return
    if (!containerRef.current) return

    const create = () => {
      if (playerRef.current) return

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: "320",
        height: "180",
        playerVars: {
          autoplay: 0,
          controls: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            setReady(true)
          },
        },
      })
    }

    if (window.YT?.Player) create()
    else window.onYouTubeIframeAPIReady = create

    return () => {
      stopAudioLoop()
      analyzerRef.current?.close()
      analyzerRef.current = null

      try {
        playerRef.current?.destroy()
      } catch {}
      playerRef.current = null
      setReady(false)
    }
  }, [visible, videoId])

  // =========================
  // Play / Pause sync
  // =========================
  useEffect(() => {
    if (!ready || !playerRef.current) return

    if (shouldPlay) {
      playerRef.current.playVideo()
      startAudioLoop()
    } else {
      playerRef.current.pauseVideo()
      stopAudioLoop()
    }
  }, [shouldPlay, ready])

  // =========================
  // AUDIO LOOP
  // =========================
  function startAudioLoop() {
    if (!ws || !ws.isOpen()) return
    if (rafRef.current) return

    if (!analyzerRef.current) {
      analyzerRef.current = new WebAudioAnalyzer()
    }

    const analyzer = analyzerRef.current
    const iframe = playerRef.current.getIframe() as HTMLIFrameElement
    const audioEl = iframe.querySelector("audio") as HTMLAudioElement | null

    if (!audioEl) {
      console.warn("[AUDIO] <audio> não encontrado no iframe")
      return
    }

    analyzer.attachToAudioElement(audioEl)
    analyzer.resetBeat()

    const loop = () => {
      if (!ws.isOpen()) return

      const elapsedMs = Math.floor(
        playerRef.current.getCurrentTime() * 1000
      )

      const frame = analyzer.readFrame(performance.now())

      ws.send({
        type: "player_audio_frame",
        data: {
          stepIndex,
          elapsedMs,
          energy: frame.energy,
          bands: frame.bands,
          beat: frame.beat,
        },
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  }

  function stopAudioLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  if (!visible || !videoId) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-white shadow-xl">
      <div className="flex justify-between px-3 py-2">
        <span className="text-xs font-semibold">YouTube</span>
        <button onClick={onClose}>✕</button>
      </div>
      <div className="p-2">
        <div ref={containerRef} />
      </div>
    </div>
  )
}