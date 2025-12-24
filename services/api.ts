// services/api.ts
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail: any = null;
    try {
      detail = await res.json();
    } catch {}
    throw new Error(
      detail?.detail ? JSON.stringify(detail.detail) : res.statusText
    );
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

// ---------------------------
// Playlist
// ---------------------------
export async function getPlaylist(): Promise<{ steps: any[] }> {
  return request(`/playlist`);
}

export async function deleteStep(index: number): Promise<any> {
  return request(`/playlist/delete/${index}`, { method: "DELETE" });
}

// ✅ NOVO: cria step a partir do link do YouTube (backend baixa o áudio)
export type AddFromYouTubePayload = {
  title: string;
  genre?: string;
  palette?: "blue" | "purple" | "green" | "orange";
  youtubeUrl: string;
  useAi?: boolean;
};

// services/api.ts

// services/api.ts

export async function addFromYouTube(payload: {
  title: string;
  genre?: string;
  palette?: "blue" | "purple" | "green" | "orange";
  youtubeUrl: string;
  useAi?: boolean;
}): Promise<any> {
  const form = new FormData();

  form.append("title", payload.title);
  form.append("youtubeUrl", payload.youtubeUrl);
  form.append("genre", payload.genre ?? "");
  form.append("palette", payload.palette ?? "blue");
  form.append("useAi", String(payload.useAi ?? true));

  return request(`/playlist/add-from-youtube`, {
    method: "POST",
    body: form, // 🚨 SEM headers — o browser seta multipart automaticamente
  });
}

// ---------------------------
// Status
// ---------------------------
export async function getStatus(): Promise<any> {
  return request(`/status`);
}

// ---------------------------
// Player (NOVO CONTRATO)
// ---------------------------
export async function playStepByIndex(index: number): Promise<{ ok: boolean }> {
  return request(`/player/play/${index}`, { method: "POST" });
}

export async function resumePlayer(): Promise<any> {
  return request(`/player/resume`, { method: "POST" });
}

export async function pausePlayer() {
  await request(`/player/pause`, {
    method: "POST",
  })
}

export async function skip() {
  await request(`/player/skip`, {
    method: "POST",
  })
}

// ---------------------------
// ESP
// ---------------------------
export async function refreshEsp(): Promise<any> {
  return request(`/esp/refresh`, { method: "POST" });
}
