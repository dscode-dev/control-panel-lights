const API_URL = "http://localhost:8000";

export async function play() {
  return fetch(`${API_URL}/play`, { method: "POST" });
}

export async function pause() {
  return fetch(`${API_URL}/pause`, { method: "POST" });
}

export async function skip() {
  return fetch(`${API_URL}/skip`, { method: "POST" });
}

export async function getStatus() {
  const res = await fetch(`${API_URL}/status`);
  return res.json();
}
