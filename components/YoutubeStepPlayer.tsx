"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type Props = {
  videoUrl: string | null
  visible: boolean

  /**
   * shouldPlay só vira true quando o usuário clica no botão PLAY do step.
   * Ao ficar true, este componente deve tocar o vídeo programaticamente.
   */
  shouldPlay: boolean

  onClose?: () => void
  onStateChange?: (state: number) => void
  onReady?: () => void
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

    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "")
      return id || null
    }

    const v = u.searchParams.get("v")
    if (v) return v

    const shortsMatch = u.pathname.match(/\/shorts\/([^/]+)/)
    if (shortsMatch?.[1]) return shortsMatch[1]

    const embedMatch = u.pathname.match(/\/embed\/([^/]+)/)
    if (embedMatch?.[1]) return embedMatch[1]

    return null
  } catch {
    return null
  }
}

async function ensureYouTubeIframeAPI(): Promise<void> {
  if (typeof window === "undefined") return
  if (window.YT && window.YT.Player) return

  await new Promise<void>((resolve) => {
    const existing = document.querySelector('script[data-yt-iframe-api="1"]')
    if (existing) {
      const check = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(check)
          resolve()
        }
      }, 50)
      return
    }

    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    tag.async = true
    tag.dataset.ytIframeApi = "1"

    window.onYouTubeIframeAPIReady = () => resolve()
    document.body.appendChild(tag)
  })
}

export default function YouTubeStepPlayer({
  videoUrl,
  visible,
  shouldPlay,
  onClose,
  onStateChange,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<any>(null)

  const [ready, setReady] = useState(false)

  const videoId = useMemo(() => {
    if (!videoUrl) return null
    return extractVideoId(videoUrl)
  }, [videoUrl])

  // Mount player only when visible (no iframe before play/prepare)
  useEffect(() => {
    let cancelled = false

    async function mount() {
      if (!visible) return
      if (!videoId) return
      if (!containerRef.current) return

      await ensureYouTubeIframeAPI()
      if (cancelled) return

      // If player already exists, just load the new video
      if (playerRef.current) {
        try {
          playerRef.current.loadVideoById(videoId)
          // after loadVideoById, keep paused unless shouldPlay says otherwise
          if (!shouldPlay) {
            try {
              playerRef.current.pauseVideo()
            } catch {}
          }
          return
        } catch {}
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        width: "320",
        height: "180",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            setReady(true)
            onReady?.()

            // ✅ Do NOT autoplay on prepare
            // ✅ If shouldPlay already true (user clicked PLAY and player just got ready), play now.
            if (shouldPlay) {
              try {
                playerRef.current?.playVideo()
              } catch {}
            } else {
              try {
                playerRef.current?.pauseVideo()
              } catch {}
            }
          },
          onStateChange: (e: any) => {
            onStateChange?.(e.data)
          },
        },
      })
    }

    mount()

    return () => {
      cancelled = true
      if (!visible && playerRef.current) {
        try {
          playerRef.current.destroy()
        } catch {}
        playerRef.current = null
        setReady(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, videoId])

  // When video changes while visible, load it (keep paused unless shouldPlay)
  useEffect(() => {
    if (!visible) return
    if (!videoId) return
    if (!playerRef.current) return

    try {
      playerRef.current.loadVideoById(videoId)
      if (!shouldPlay) {
        playerRef.current.pauseVideo()
      }
      setReady(true)
    } catch {}
  }, [videoId, visible])

  // Play/pause controlled strictly by shouldPlay (source: PLAY button)
  useEffect(() => {
    if (!visible) return
    if (!playerRef.current) return

    try {
      if (shouldPlay) playerRef.current.playVideo()
      else playerRef.current.pauseVideo()
    } catch {}
  }, [shouldPlay, visible])

  if (!visible) return null

  if (!videoId) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-[340px] rounded-2xl border border-gray-200/70 bg-white shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/60">
          <div className="text-xs font-semibold tracking-widest uppercase text-gray-500">
            YouTube
          </div>
          <button
            className="text-xs text-gray-500 hover:text-gray-900"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <div className="p-3 text-sm text-red-600">
          URL do YouTube inválida para este step.
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] rounded-2xl border border-gray-200/70 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold tracking-widest uppercase text-gray-500">
            YouTube
          </div>
          {ready ? (
            <span className="text-[11px] text-gray-500">Pronto</span>
          ) : (
            <span className="text-[11px] text-gray-500">Carregando…</span>
          )}
        </div>

        <button
          className="text-xs text-gray-500 hover:text-gray-900"
          onClick={onClose}
          title="Fechar player"
        >
          Fechar
        </button>
      </div>

      <div className="p-2">
        <div
          ref={containerRef}
          className="w-full overflow-hidden rounded-xl bg-black"
        />
      </div>
    </div>
  )
}