// services/api.ts
const BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  )

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
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

export async function getPlaylist(): Promise<{ steps: any[] }> {
  return request(`/playlist`)
}

export async function getStatus(): Promise<any> {
  return request(`/status`)
}

// ✅ player controls (NOVO)
export async function pausePlayer(): Promise<any> {
  return request(`/player/pause`, { method: "POST" })
}

export async function resumePlayer(): Promise<any> {
  return request(`/player/resume`, { method: "POST" })
}

export async function stopPlayer(): Promise<any> {
  return request(`/player/stop`, { method: "POST" })
}

export async function play(): Promise<any> {
  return request(`/player/play`, { method: "POST" })
}

export async function skip(): Promise<any> {
  return request(`/skip`, { method: "POST" })
}

export async function playStep(index: number): Promise<any> {
  // mantém o endpoint que você já tinha em uso
  return request(`/player/play`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ index }),
  })
}

export async function deleteStep(index: number): Promise<any> {
  return request(`/playlist/delete/${index}`, { method: "DELETE" })
}

export async function refreshEsp() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/esp/refresh`, {
    method: "POST",
  })

  if (!res.ok) {
    throw new Error("Failed to refresh ESP status")
  }

  return res.json()
}

export function playStepByIndex(index: number) {
  return request<{ ok: boolean }>(`/player/play/${index}`, {
    method: "POST",
  })
}

// Se você já usa multipart para add, mantenha seus exports existentes.
// (Não alterei aqui porque seu fluxo atual pode estar diferente.)