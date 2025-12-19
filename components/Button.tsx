"use client"

import { ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "ghost"

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export default function Button({
  variant = "secondary",
  className = "",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-[0.98]"

const variants: Record<Variant, string> = {
  primary:
    "bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-strong))] border border-transparent",
  secondary:
    "bg-[rgb(var(--surface))] text-[rgb(var(--text-main))] hover:bg-[rgb(var(--surface-2))] border border-[rgb(var(--border))]",
  ghost:
    "bg-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-main))] hover:bg-[rgb(var(--surface-2))] border border-transparent",
}


  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${className}`}
    />
  )
}
