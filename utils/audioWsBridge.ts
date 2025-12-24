// utils/audioWsBridge.ts
import { WebAudioAnalyzer } from "./audioEngine"
import type { WsClient } from "@/services/socket"

type StartOpts = {
  ws: WsClient
  getActiveIndex: () => number
  isPlaying: () => boolean
}

export class AudioWsBridge {
  private analyzer = new WebAudioAnalyzer()
  private rafId: number | null = null
  private audioEl: HTMLAudioElement | null = null

  async attachAudioElement(el: HTMLAudioElement) {
    this.audioEl = el
    await this.analyzer.unlock()
    this.analyzer.attachToAudioElement(el)
  }

  start(opts: StartOpts) {
    const loop = () => {
      if (!opts.isPlaying()) {
        this.rafId = requestAnimationFrame(loop)
        return
      }

      const stepIndex = opts.getActiveIndex()
      if (stepIndex < 0) {
        this.rafId = requestAnimationFrame(loop)
        return
      }

      const frame = this.analyzer.readFrame(performance.now())

      opts.ws.send({
        type: "player_audio_frame",
        data: {
          stepIndex, // 🔥 FONTE ÚNICA: BACKEND
          elapsedMs: frame.ts,
          energy: frame.energy,
          bands: frame.bands,
          beat: frame.beat,
        },
      })

      this.rafId = requestAnimationFrame(loop)
    }

    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(loop)
    }
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.analyzer.resetBeat()
  }
}