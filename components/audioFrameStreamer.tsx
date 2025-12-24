// components/AudioFrameStreamer.tsx
"use client"

import { useEffect, useMemo, useRef } from "react"
import { WebAudioAnalyzer } from "@/utils/audioEngine"
import type { WsClient } from "@/services/socket"

type Props = {
  ws: WsClient | null

  // controle
  enabled: boolean
  shouldPlay: boolean

  // contexto do step
  stepIndex: number
  audioUrl: string | null

  // tempo alvo (pra enviar no WS): usamos currentTime do áudio
  tickHz?: number
}

function clamp01(x: any) {
  const n = Number(x)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export default function AudioFrameStreamer({
  ws,
  enabled,
  shouldPlay,
  stepIndex,
  audioUrl,
  tickHz = 30,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyzerRef = useRef<WebAudioAnalyzer | null>(null)

  const intervalMs = useMemo(() => Math.max(16, Math.floor(1000 / tickHz)), [tickHz])

  // cria analyzer uma vez
  useEffect(() => {
    analyzerRef.current = new WebAudioAnalyzer()
    return () => {
      analyzerRef.current?.close?.()
      analyzerRef.current = null
    }
  }, [])

  // quando muda audioUrl: carrega novo áudio e reatacha analyzer
  useEffect(() => {
    if (!enabled) return
    if (!audioUrl) return

    const el = audioRef.current
    if (!el) return

    el.src = audioUrl
    el.load()

    ;(async () => {
      try {
        await analyzerRef.current?.unlock?.()
        // attach após carregar src
        analyzerRef.current?.attachToAudioElement(el)
        analyzerRef.current?.resetBeat?.()
      } catch {}
    })()
  }, [audioUrl, enabled])

  // play/pause do áudio local
  useEffect(() => {
    const el = audioRef.current
    if (!enabled || !el) return

    ;(async () => {
      try {
        await analyzerRef.current?.unlock?.()
        if (shouldPlay) {
          await el.play()
        } else {
          el.pause()
        }
      } catch {
        // play pode falhar se não houve gesto do user (mas no teu fluxo tem click)
      }
    })()
  }, [shouldPlay, enabled])

  // loop de envio de frames
  useEffect(() => {
    if (!enabled) return
    if (!shouldPlay) return
    if (!ws || !ws.isOpen()) return
    if (!audioUrl) return

    let timer: any = null

    const tick = () => {
      const el = audioRef.current
      const analyzer = analyzerRef.current
      if (!el || !analyzer) return

      // elapsed baseado no áudio local (fonte real)
      const elapsedMs = Math.max(0, Math.floor(el.currentTime * 1000))

      const frame = analyzer.readFrame(elapsedMs)

      const payload = {
        type: "player_audio_frame",
        data: {
          stepIndex,
          elapsedMs,
          energy: clamp01(frame.energy),
          bands: {
            bass: clamp01(frame.bands.bass),
            mid: clamp01(frame.bands.mid),
            treble: clamp01(frame.bands.treble),
          },
          beat: Boolean(frame.beat),
        },
      }

      ws.send(payload)
    }

    timer = setInterval(tick, intervalMs)

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [enabled, shouldPlay, ws, audioUrl, stepIndex, intervalMs])

  // sempre renderiza, mas só toca se enabled
  return (
    <audio
      ref={audioRef}
      preload="auto"
      // ✅ aqui é o som real (se quiser ouvir). Se quiser só analisar, coloca muted.
      // Para show, deixa SEM muted (senão você não escuta nada).
      controls={false}
      style={{ display: "none" }}
    />
  )
}