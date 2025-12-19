"use client"

import Button from "./Button"
import { EspNode } from "../types/playlist"
import { refreshEsp } from "../services/api"
import { useState } from "react"

export default function EspStatusPanel({ nodes }: { nodes: EspNode[] }) {
  const [loading, setLoading] = useState(false)

  async function onRefresh() {
    try {
      setLoading(true)
      await refreshEsp()
      // atualização real vem via WebSocket / polling
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-sm">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-4">
        <div>
          <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
            ESPs
          </div>
          <div className="mt-1 text-lg font-semibold text-[rgb(var(--text-main))]">
            Status & Roteamento
          </div>
          <div className="mt-1 text-sm text-[rgb(var(--text-muted))]">
            Monitoramento dos controladores físicos
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "🔄 Verificando..." : "🔄 Atualizar"}
        </Button>
      </div>

      {/* LISTA */}
      <div className="p-5 space-y-3">
        {nodes.length === 0 && (
          <div className="text-sm text-[rgb(var(--text-muted))]">
            Nenhum ESP registrado.
          </div>
        )}

        {nodes.map((esp) => {
          const online = esp.status === "online"

          return (
            <div
              key={esp.id}
              className="rounded-xl border border-[rgb(var(--border))] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        online ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />
                    <span className="font-semibold text-[rgb(var(--text-main))]">
                      {esp.name}
                    </span>
                  </div>

                  <div className="mt-1 text-sm text-[rgb(var(--text-muted))]">
                    Último ping: {esp.lastPing}
                  </div>
                </div>

                <div
                  className={`text-xs font-semibold ${
                    online ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {online ? "ONLINE" : "OFFLINE"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {esp.routes.map((r) => (
                  <span
                    key={r}
                    className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-2.5 py-1 text-xs text-[rgb(var(--text-muted))]"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
