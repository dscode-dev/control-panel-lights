"use client"

import { useCallback, useState } from "react"

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const enter = useCallback(() => {
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen()
      setIsFullscreen(true)
    }
  }, [])

  const exit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  return { isFullscreen, enter, exit }
}
