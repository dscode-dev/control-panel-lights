"use client";

import type { UiMode } from "@/utils/uiMode";

export default function PlayerControls({
  mode,
  isPlaying,
  bpm,
  onPause,
  onResume,
  onSkip,
}: {
  mode: UiMode;
  isPlaying: boolean;
  bpm: number;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-xs font-semibold tracking-widest uppercase text-gray-500">
          Controls
        </div>

        <div className="text-sm text-gray-700">
          BPM: <span className="font-semibold">{bpm || 0}</span>
        </div>

        <div
          className={`text-xs px-2 py-1 rounded-full border ${
            isPlaying
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-gray-200 bg-gray-50 text-gray-600"
          }`}
        >
          {isPlaying ? "Tocando" : "Pausado"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPlaying ? (
          <button
            onClick={onPause}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
          >
            ⏸ Pausar
          </button>
        ) : (
          <button
            onClick={onResume}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
          >
            ▶ Retomar
          </button>
        )}

        <button
          onClick={onSkip}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
        >
          ⏭ Próximo
        </button>
      </div>
    </div>
  );
}