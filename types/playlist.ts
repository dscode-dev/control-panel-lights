export type PlayerState = "playing" | "paused" | "stopped";

export interface PlaylistStep {
  id: string;
  type: "music" | "presentation" | "pause";
  label: string;
}

export type PlaylistPalette = "blue" | "purple" | "green" | "orange";

export type StepType = "music" | "presentation" | "pause"

export type EspTarget = "right" | "left" | "portal" | "hologram" | "broadcast"

export interface EspCommand {
  target: EspTarget
  type:
    | "set_mode"
    | "set_palette"
    | "beat"
    | "hologram_behavior"
    | "portal_mode"
    | "pause"
  payload: Record<string, any>
}

export interface PlaylistStep {
  id: string
  title: string
  type: StepType

  // execução
  durationMs: number
  bpm?: number
  palette?: PlaylistPalette

  // música
  trackTitle?: string
  genre?: string
  audioFile?: string

  // show
  hologram?: string
  leds?: string
  portal?: string

  // comandos ESP (simulação)
  esp?: EspCommand[]
}

