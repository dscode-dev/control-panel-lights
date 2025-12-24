// utils/audioEngine.ts
export type Bands = { bass: number; mid: number; treble: number }

export type AudioFrame = {
  ts: number
  energy: number
  bands: Bands
  beat: boolean
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

export class WebAudioAnalyzer {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaElementAudioSourceNode | null = null
  private data: Uint8Array | null = null

  private lastBeatAt = 0
  private beatCooldownMs = 120
  private beatThreshold = 0.62 // ajuste fino depois

  ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext()
    }
    return this.ctx
  }

  async unlock() {
    const ctx = this.ensureContext()
    if (ctx.state === "suspended") await ctx.resume()
  }

  attachToAudioElement(el: HTMLAudioElement) {
    const ctx = this.ensureContext()
    if (!this.analyser) {
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.analyser.smoothingTimeConstant = 0.75
      this.data = new Uint8Array(this.analyser.frequencyBinCount)
    }

    // se já tinha source, não recria (evita erro "already connected")
    if (!this.source) {
      this.source = ctx.createMediaElementSource(el)
      this.source.connect(this.analyser)
      // não conectar no destination (pra não tocar) — mas o <audio> pode tocar mutado
      // Se você quiser “ouvir” pelo <audio>, conecte destination.
      // this.analyser.connect(ctx.destination)
    }
  }

  readFrame(nowTs: number): AudioFrame {
    if (!this.analyser || !this.data) {
      return {
        ts: nowTs,
        energy: 0,
        bands: { bass: 0, mid: 0, treble: 0 },
        beat: false,
      }
    }

    this.analyser.getByteFrequencyData(this?.data)

    // bins 0..N (0..255). Vamos calcular bandas por ranges simples.
    const n = this.data.length
    const bassEnd = Math.floor(n * 0.15)
    const midEnd = Math.floor(n * 0.55)

    let bass = 0,
      mid = 0,
      treble = 0

    for (let i = 0; i < bassEnd; i++) bass += this.data[i]
    for (let i = bassEnd; i < midEnd; i++) mid += this.data[i]
    for (let i = midEnd; i < n; i++) treble += this.data[i]

    bass = bass / (bassEnd * 255)
    mid = mid / ((midEnd - bassEnd) * 255)
    treble = treble / ((n - midEnd) * 255)

    bass = clamp01(bass)
    mid = clamp01(mid)
    treble = clamp01(treble)

    // energy (média ponderada)
    const energy = clamp01(bass * 0.55 + mid * 0.30 + treble * 0.15)

    // beat simples: bass acima do limiar + cooldown
    const nowMs = performance.now()
    const canBeat = nowMs - this.lastBeatAt > this.beatCooldownMs
    const beat = canBeat && bass >= this.beatThreshold

    if (beat) this.lastBeatAt = nowMs

    return {
      ts: nowTs,
      energy,
      bands: { bass, mid, treble },
      beat,
    }
  }

  resetBeat() {
    this.lastBeatAt = 0
  }

  async close() {
    try {
      if (this.ctx) await this.ctx.close()
    } catch {}
    this.ctx = null
    this.analyser = null
    this.source = null
    this.data = null
  }
}