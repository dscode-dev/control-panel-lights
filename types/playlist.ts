export type PlaylistPalette = "blue" | "purple" | "green" | "orange";
export type StepType = "music" | "presentation" | "pause";

export type EspTarget = "right" | "left" | "portal" | "hologram" | "broadcast";

export interface EspCommand {
  target: EspTarget;
  type:
    | "set_mode"
    | "set_palette"
    | "beat"
    | "hologram_behavior"
    | "portal_mode"
    | "pause";
  payload: Record<string, any>;
}

export interface PlaylistStep {
  id: string;
  title: string;
  type: "music" | "presentation" | "pause";

  status: StepStatus;
  progress?: number; // 0..1 (apenas processing)

  palette?: "blue" | "purple" | "green" | "orange";
  genre?: string;

  durationMs?: number;
  bpm?: number;

  trackTitle?: string;
  audioFile?: string;

  hologram?: string;
  leds?: string;
  portal?: string;
}

export type EspStatus = "online" | "offline";

export interface EspNode {
  id: "right" | "left" | "portal" | "hologram";
  name: string;
  status: EspStatus;
  lastPing: string;
  routes: string[];
}

export type StepStatus = "processing" | "ready" | "error";
