"use client"

import Button from "./Button"
import { UiMode } from "../utils/uiMode"

export default function Header({
  mode,
  onToggleMode,
}: {
  mode: UiMode
  onToggleMode: () => void
}) {
  return (
    <header className="flex items-center justify-between px-4 pt-4">
      <div>
        <div className="text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase">
          Painel
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-[rgb(var(--text-main))]">
          {mode === "operator" ? "Controle do Show" : "SHOW MODE"}
        </h1>
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
          Playlist • LEDs • Holograma • Portal
        </p>
      </div>

      {/* <Button variant="secondary" onClick={onToggleMode}>
        {mode === "operator" ? "🎭 Show Mode" : "🎛 Operador"}
      </Button> */}
    </header>
  )
}
