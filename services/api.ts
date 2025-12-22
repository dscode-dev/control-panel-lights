export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000"

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || `${res.status} ${res.statusText}`)
  }

  if (res.status === 204) {
    return undefined as unknown as T
  }

  return res.json() as Promise<T>
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

export async function addStep(formData: FormData) {
  const res = await fetch(
    `${API_BASE}/playlist/add`,
    {
      method: "POST",
      body: formData,
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || "Erro ao criar step")
  }

  return res.json() as Promise<{ stepId: string }>
}

export async function addPresentation(formData: FormData) {
  const res = await fetch(
    `${API_BASE}/playlist/add-presentation`,
    {
      method: "POST",
      body: formData,
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || "Erro ao criar apresentação")
  }

  return res.json() as Promise<{ stepId: string }>
}

export async function addPause(payload: {
  title: string
  durationMs: number
}) {
  const res = await fetch(
    `${API_BASE}/playlist/add-pause`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(text || "Erro ao criar pause")
  }

  return res.json() as Promise<{ stepId: string }>
}