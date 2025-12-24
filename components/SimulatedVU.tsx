"use client"

import { useEffect, useRef } from "react"

interface Props {
  active: boolean
}

export default function SimulatedVU({ active }: Props) {
  const barRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    function tick() {
      if (!barRef.current) return

      const level = Math.max(0.08, Math.random())
      barRef.current.style.width = `${level * 100}%`

      rafRef.current = requestAnimationFrame(tick)
    }

    if (active) {
      rafRef.current = requestAnimationFrame(tick)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null

      if (barRef.current) {
        barRef.current.style.width = "0%"
      }
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [active])

  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
      <div
        ref={barRef}
        className="h-full transition-[width] duration-150
                   bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        style={{ width: "0%" }}
      />
    </div>
  )
}