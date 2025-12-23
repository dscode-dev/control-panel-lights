// utils/playlistStore.ts
import { create } from "zustand"
import type { PlaylistStep } from "@/types/playlist"

type PlaylistStore = {
  steps: PlaylistStep[]
  setSteps: (steps: PlaylistStep[]) => void
  addStep: (step: PlaylistStep) => void
  upsertStep: (step: PlaylistStep) => void
  updateStepById: (id: string, patch: Partial<PlaylistStep>) => void
  removeStep: (index: number) => void
  clear: () => void
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  steps: [],

  setSteps: (steps) => set({ steps }),

  addStep: (step) =>
    set((state) => ({
      steps: [...state.steps, step],
    })),

  // ✅ substitui 100% o item (não faz merge de completed)
  upsertStep: (step) =>
    set((state) => {
      const idx = state.steps.findIndex((s) => s.id === step.id)
      if (idx === -1) return { steps: [...state.steps, step] }

      const next = [...state.steps]
      next[idx] = step
      return { steps: next }
    }),

  updateStepById: (id, patch) =>
    set((state) => {
      const idx = state.steps.findIndex((s) => s.id === id)
      if (idx === -1) return state

      const next = [...state.steps]
      next[idx] = { ...next[idx], ...patch }
      return { steps: next }
    }),

  removeStep: (index) =>
    set((state) => ({
      steps: state.steps.filter((_, i) => i !== index),
    })),

  clear: () => set({ steps: [] }),
}))