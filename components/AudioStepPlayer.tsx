"use client"

import { useEffect, useRef } from "react"

interface Props {
  stepId: string | null
  visible: boolean
  shouldPlay: boolean
  onClose: () => void
}

export default function AudioStepPlayer({
  stepId,
  visible,
  shouldPlay,
  onClose,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioRef.current) return

    if (shouldPlay) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [shouldPlay])

  if (!visible || !stepId) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999] rounded-2xl bg-white shadow-xl border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">Áudio do Backend</div>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1 rounded-lg border hover:bg-gray-50"
        >
          Fechar
        </button>
      </div>

      <audio
        ref={audioRef}
        src={`${process.env.NEXT_PUBLIC_API_URL}/audio/stream/${stepId}`}
        controls
        autoPlay={shouldPlay}
        className="w-full"
      />
    </div>
  )
}