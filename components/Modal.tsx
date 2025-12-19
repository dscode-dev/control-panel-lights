"use client"

import { ReactNode, useEffect } from "react"

export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    if (open) window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-xl">
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] px-5 py-4">
          <div className="text-base font-semibold text-[rgb(var(--text-main))]">
            {title}
          </div>
          <button
            className="rounded-lg px-2 py-1 text-sm text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-2))]"
            onClick={onClose}
          >
            Esc
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-[rgb(var(--border))] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
