import { API_BASE } from "./api"

type Handler = (data: any) => void

export function connectSocket(
  onMessage: (msg: any) => void,
  onOpen: () => void,
  onClose: () => void
) {
  let ws: WebSocket | null = null
  let retries = 0

  function connect() {
    const url = API_BASE.replace(/^http/, "ws") + "/ws"
    ws = new WebSocket(url)

    ws.onopen = () => {
      retries = 0
      onOpen()
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onMessage(msg)
      } catch {}
    }

    ws.onclose = () => {
      onClose()
      const delay = Math.min(5000, 1000 * ++retries)
      setTimeout(connect, delay)
    }
  }

  connect()

  return {
    close: () => ws?.close(),
  }
}

