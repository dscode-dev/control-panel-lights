"use client"

import { useEffect, useRef, useState } from "react"
import { WebAudioAnalyzer } from "@/utils/audioEngine"

type Props = {
  videoUrl: string | null
  visible: boolean
  shouldPlay: boolean
  onReady?: (analyzer: WebAudioAnalyzer | null) => void
  onClose?: () => void
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null
    if (u.searchParams.get("v")) return u.searchParams.get("v")
    return null
  } catch {
    return null
  }
}

declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

export default function YouTubeStepPlayer({
  videoUrl,
  visible,
  shouldPlay,
  onReady,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<any>(null)
  const analyzerRef = useRef<WebAudioAnalyzer | null>(null)

  const [ready, setReady] = useState(false)
  const videoId = videoUrl ? extractVideoId(videoUrl) : null

  // load iframe api
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.YT?.Player) return

    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.body.appendChild(tag)
  }, [])

  // create player
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
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: async (event: any) => {
            setReady(true)

            try {
              const iframe = event.target.getIframe() as HTMLIFrameElement
              const videoEl = iframe.querySelector("video") as HTMLVideoElement | null

              if (videoEl) {
                const analyzer = new WebAudioAnalyzer()
                await analyzer.unlock()
                analyzer.attachToAudioElement(videoEl)
                analyzerRef.current = analyzer
                onReady?.(analyzer)
              } else {
                onReady?.(null)
              }
            } catch {
              onReady?.(null)
            }
          },
        },
      })
    }

    if (window.YT?.Player) create()
    else window.onYouTubeIframeAPIReady = create

    return () => {
      try {
        analyzerRef.current?.close()
      } catch {}
      analyzerRef.current = null

      try {
        playerRef.current?.destroy?.()
      } catch {}

      playerRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, videoId])

  // play / pause
  useEffect(() => {
    if (!ready || !playerRef.current || !visible) return
    try {
      if (shouldPlay) playerRef.current.playVideo()
      else playerRef.current.pauseVideo()
    } catch {}
  }, [shouldPlay, ready, visible])

  if (!visible || !videoId) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-xs font-semibold text-slate-700">YouTube</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Fechar
        </button>
      </div>
      <div className="p-2">
        <div ref={containerRef} />
      </div>
    </div>
  )
}