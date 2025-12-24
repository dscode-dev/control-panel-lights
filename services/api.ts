// services/api.ts
const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  )

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })

  if (!res.ok) {
    let detail: any = null
    try {
      detail = await res.json()
    } catch {}
    throw new Error(detail?.detail ? JSON.stringify(detail.detail) : res.statusText)
  }

  const ct = res.headers.get("content-type") || ""
  if (ct.includes("application/json")) return (await res.json()) as T
  return (await res.text()) as unknown as T
}

// ---------------------------
// Playlist
// ---------------------------
export async function getPlaylist(): Promise<{ steps: any[] }> {
  return request(`/playlist`)
}

export async function deleteStep(index: number): Promise<any> {
  return request(`/playlist/delete/${index}`, { method: "DELETE" })
}

// ---------------------------
// Status
// ---------------------------
export async function getStatus(): Promise<any> {
  return request(`/status`)
}

// ---------------------------
// Player (NOVO CONTRATO)
// ---------------------------
export async function playStepByIndex(index: number): Promise<{ ok: boolean }> {
  return request(`/player/play/${index}`, { method: "POST" })
}

export async function pausePlayer(): Promise<any> {
  return request(`/player/pause`, { method: "POST" })
}

export async function resumePlayer(): Promise<any> {
  return request(`/player/resume`, { method: "POST" })
}

export async function skip(): Promise<any> {
  return request(`/skip`, { method: "POST" })
}

// ---------------------------
// ESP
// ---------------------------
export async function refreshEsp(): Promise<any> {
  return request(`/esp/refresh`, { method: "POST" })
}