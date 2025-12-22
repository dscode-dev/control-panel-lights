"use client"

import { useState } from "react"
import Button from "./Button"

type StepType = "music" | "presentation" | "pause"

export default function StepForm({
  onSubmit,
}: {
  onSubmit: (data: FormData) => void
}) {
  const [type, setType] = useState<StepType>("music")
  const [useAI, setUseAI] = useState(true)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit(formData)
  }

  const input =
    "w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.25)]"

  const label =
    "text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* =======================
          TITLE
      ======================= */}
      <div>
        <div className={label}>Nome do Step</div>
        <input
          name="title"
          className={input}
          placeholder="Ex: Troca de faixa / Chamar galera"
          required
        />
      </div>

      {/* =======================
          TYPE
      ======================= */}
      <div>
        <div className={label}>Tipo</div>
        <select
          name="type"
          className={input}
          value={type}
          onChange={(e) => setType(e.target.value as StepType)}
        >
          <option value="music">music</option>
          <option value="presentation">presentation</option>
          <option value="pause">pause</option>
        </select>
      </div>

      {/* =======================
          PALETTE
      ======================= */}
      <div>
        <div className={label}>Paleta</div>
        <select name="palette" className={input}>
          <option value="blue">blue</option>
          <option value="purple">purple</option>
          <option value="green">green</option>
          <option value="orange">orange</option>
        </select>
      </div>

      {/* =======================
          MUSIC
      ======================= */}
      {type === "music" && (
        <>
          <div>
            <div className={label}>Gênero</div>
            <input
              name="genre"
              className={input}
              placeholder="Ex: Pagode"
            />
          </div>

          <div>
            <div className={label}>Link do YouTube</div>
            <input
              name="youtubeUrl"
              className={input}
              placeholder="https://youtube.com/..."
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[rgb(var(--text-main))]">
            <input
              type="checkbox"
              name="useAI"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
            />
            Usar IA para otimizar o show de LEDs
          </label>
        </>
      )}

      {/* =======================
          PRESENTATION
      ======================= */}
      {type === "presentation" && (
        <>
          <div>
            <div className={label}>Arquivo de áudio</div>
            <input
              type="file"
              name="audioFile"
              accept=".mp3,.wav"
              className={input}
              required
            />
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
              Áudio local usado na apresentação
            </p>
          </div>

          <div>
            <div className={label}>Sequência de LEDs (JSON)</div>
            <input
              type="file"
              name="ledSequence"
              accept=".json"
              className={input}
              required
            />
            <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
              JSON versionado com <code>timeline → atMs / cmd / target / payload</code>
            </p>
          </div>
        </>
      )}

      {/* =======================
          PAUSE
      ======================= */}
      {type === "pause" && (
        <div>
          <div className={label}>Duração (ms)</div>
          <input
            type="number"
            name="durationMs"
            className={input}
            defaultValue={3000}
            min={500}
          />
        </div>
      )}

      {/* =======================
          SUBMIT
      ======================= */}
      <div className="flex justify-end pt-4">
        <Button variant="primary" type="submit">
          Criar Step
        </Button>
      </div>
    </form>
  )
}
