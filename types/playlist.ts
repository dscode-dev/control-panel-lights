// types/playlist.ts

export type StepStatus = "processing" | "ready" | "error"

export interface EspCommand {
  atMs?: number
  target: "right" | "left" | "portal" | "hologram" | "broadcast"
  type: string
  payload: Record<string, any>
}

export interface PlaylistStep {
  id: string
  title: string
  type: "music" | "presentation" | "pause"

  status: StepStatus
  progress: number

  palette: "blue" | "purple" | "green" | "orange"
  genre: string

  durationMs: number
  bpm: number

  // ⚠️ backend pode mandar null enquanto processa
  trackTitle?: string | null
  audioFile?: string | null

  hologram?: string | null
  leds?: string | null
  portal?: string | null

  youtubeUrl?: string | null

  esp: EspCommand[]

  // opcional (WS)
  pipelineStage?: string
}