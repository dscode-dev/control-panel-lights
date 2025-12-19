export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${res.status} ${res.statusText}: ${text || path}`)
  }

  // 204 no content
  if (res.status === 204) return undefined as unknown as T
  return (await res.json()) as T
}

// ---------- Types returned by backend ----------
export type PlayerStatus = {
  isPlaying: boolean
  activeIndex: number
  elapsedMs: number
  bpm: number
  palette: string
  currentTitle: string
  currentType: string
}

export type EspNode = {
  id: "right" | "left" | "portal" | "hologram"
  name: string
  status: "online" | "offline"
  lastPing: string
  routes: string[]
}

// ---------- Playlist ----------
export async function getPlaylist() {
  return request<{ steps: any[] }>("/playlist")
}

export async function addStep(step: any) {
  return request<void>("/playlist/add", {
    method: "POST",
    body: JSON.stringify(step),
  })
}

export async function editStep(index: number, step: any) {
  return request<void>(`/playlist/edit/${index}`, {
    method: "PUT",
    body: JSON.stringify(step),
  })
}

export async function deleteStep(index: number) {
  return request<void>(`/playlist/delete/${index}`, { method: "DELETE" })
}

// ---------- Player controls ----------
export async function play() {
  return request<void>("/play", { method: "POST" })
}

export async function pause() {
  return request<void>("/pause", { method: "POST" })
}

export async function skip() {
  return request<void>("/skip", { method: "POST" })
}

export async function playStep(index: number) {
  return request<void>("/play-step", {
    method: "POST",
    body: JSON.stringify({ index }),
  })
}

// ---------- Status ----------
export async function getStatus() {
  return request<PlayerStatus>("/status")
}

// ---------- ESP monitoring ----------
export async function getEspStatus() {
  return request<{ nodes: EspNode[] }>("/esp/status")
}

export async function refreshEsp() {
  return request<void>("/esp/refresh", { method: "POST" })
}

export async function addStepFromYoutube(payload: {
  title: string
  type: string
  palette: string
  genre: string
  youtubeUrl: string
  useAI: boolean
}) {
  return request<{ stepId: string }>("/playlist/add-from-youtube", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

