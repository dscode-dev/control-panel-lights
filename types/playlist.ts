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

  trackTitle: string
  audioFile: string

  hologram: string
  leds: string
  portal: string

  esp: EspCommand[]
}
