import { API_BASE } from "./api"

type Handler = (data: any) => void

export function connectSocket(onMessage: Handler) {
  // Convert http(s) -> ws(s)
  const wsUrl = API_BASE.replace(/^http/, "ws") + "/ws"

  const ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    // optional: identify client
    ws.send(JSON.stringify({ type: "hello", role: "ui" }))
  }

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data)
      onMessage(data)
    } catch {
      // ignore invalid frames
    }
  }

  return {
    close: () => ws.close(),
    isOpen: () => ws.readyState === WebSocket.OPEN,
  }
}
