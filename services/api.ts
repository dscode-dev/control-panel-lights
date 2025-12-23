export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

// services/api.ts

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `HTTP ${res.status}`)
  }

  // endpoints que podem retornar vazio
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    return {} as T
  }
  return (await res.json()) as T
}

// ✅ endpoint CORRETO solicitado: POST /player/pause
export function pausePlayer() {
  return request<void>("/playlist/player/pause", { method: "POST" })
}

/* ======================
   TYPES (backend contract)
====================== */

export type PlayerStatus = {
  isPlaying: boolean;
  activeIndex: number;
  elapsedMs: number;
  bpm: number;
  palette: string;
  currentTitle: string;
  currentType: "music" | "presentation" | "pause";
};

export type PlaylistResponse = { steps: any[] };
export type EspStatusResponse = { nodes: any[] };

/* ======================
   PLAYLIST
====================== */

export function getPlaylist() {
  return request<PlaylistResponse>("/playlist");
}

/**
 * JSON version (OFICIAL)
 * Backend NÃO espera audio
 */
export function addFromYoutube(data: {
  title: string;
  youtubeUrl: string;
  type?: "music" | "voice";
  palette?: string;
  genre?: string;
  useAI?: boolean;
}) {
  return request<{ stepId: string }>("/playlist/add-from-youtube", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function addPresentation(formData: FormData) {
  return request<{ stepId: string }>("/playlist/add-presentation", {
    method: "POST",
    body: formData,
  });
}

// export function addPause(payload: { title: string; durationMs: number }) {
//   return request<{ stepId: string }>("/playlist/add-pause", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });
// }

export function editStep(index: number, payload: any) {
  return request<void>(`/playlist/edit/${index}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteStep(index: number) {
  return request<void>(`/playlist/delete/${index}`, {
    method: "DELETE",
  });
}

/* ======================
   PLAYER
====================== */

export function play() {
  return request<void>("/play", { method: "POST" });
}

export function pause() {
  return request<void>("/pause", { method: "POST" });
}

export function skip() {
  return request<void>("/skip", { method: "POST" });
}

export function playStep(index: number) {
  return request<void>("/play-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index }),
  });
}

/* ======================
   STATUS + ESP
====================== */

export function getStatus() {
  return request<PlayerStatus>("/status");
}

export function getEspStatus() {
  return request<EspStatusResponse>("/esp/status");
}

export function refreshEsp() {
  return request<void>("/esp/refresh", { method: "POST" });
}

/**
 * Multipart version for YouTube pipeline
 * Used when backend expects multipart/form-data
 */
export function addFromYoutubeMultipart(formData: FormData) {
  return request<{ stepId: string }>("/playlist/add-from-youtube", {
    method: "POST",
    body: formData, // multipart/form-data (browser sets headers)
  });
}
