import { API_BASE } from "./api"

type Handlers = {
  onOpen?: () => void
  onClose?: () => void
  onMessage: (msg: any) => void
}

// services/socket.ts
export type WsMessage = { type: string; data?: any }

type ConnectOpts = {
  onMessage: (msg: WsMessage) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (e: Event) => void
}

const DEBUG_WS = process.env.NEXT_PUBLIC_DEBUG_WS === "1"

function log(...args: any[]) {
  if (DEBUG_WS) console.log(...args)
}

function toWsUrl(httpBase: string) {
  return httpBase.replace(/^http/i, "ws").replace(/\/$/, "") + "/ws"
}

export function connectSocket(opts: ConnectOpts) {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:8000"

  const wsUrl = toWsUrl(base)

  let ws: WebSocket | null = null
  let closedByUser = false
  let retry = 0
  let retryTimer: any = null

  const open = () => {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      retry = 0
      log("[WS] connected:", wsUrl)
      opts.onOpen?.()
    }

    ws.onclose = () => {
      log("[WS] disconnected")
      opts.onClose?.()

      if (closedByUser) return

      // backoff simples (até 5s)
      retry += 1
      const delay = Math.min(5000, 300 * retry)
      retryTimer = setTimeout(open, delay)
    }

    ws.onerror = (e) => {
      log("[WS] error:", e)
      opts.onError?.(e)
    }

    ws.onmessage = (ev) => {
      try {
        const raw = JSON.parse(ev.data)
        log("[WS] raw:", raw)

        const type = raw?.type ?? raw?.event ?? raw?.kind
        const data = raw?.data ?? raw?.payload ?? raw

        if (!type || typeof type !== "string") {
          log("[WS] missing type:", raw)
          return
        }

        const msg: WsMessage = { type, data }
        log("[WS] normalized:", msg.type, msg.data)
        opts.onMessage(msg)
      } catch (e) {
        log("[WS] parse_failed:", ev.data, e)
      }
    }
  }

  open()

  return {
    close: () => {
      closedByUser = true
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
    },
  }
}

function confirmInBrowser() {
  // Next.js safety: this ensures WebSocket only runs client-side
  if (typeof window === "undefined") {
    throw new Error("connectSocket must run in the browser")
  }
}
