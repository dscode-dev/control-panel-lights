"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import PlayerControls from "../components/PlayerControls";
import StatusPanel from "../components/StatusPanel";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { UiMode } from "../utils/uiMode";
import { PlaylistStep } from "../types/playlist";
import PlaylistView from "@/components/PaylistView";
import { EspNode } from "../types/playlist";
import EspStatusPanel from "@/components/ESPStatusPanel";

const espNodes: EspNode[] = [
  {
    id: "right",
    name: "ESP Direita",
    status: "online",
    lastPing: "agora",
    routes: ["VU", "Contorno"],
  },
  {
    id: "left",
    name: "ESP Esquerda",
    status: "online",
    lastPing: "2s atrás",
    routes: ["VU", "Contorno"],
  },
  {
    id: "portal",
    name: "ESP Portal",
    status: "offline",
    lastPing: "—",
    routes: ["Portal", "Estrelas"],
  },
  {
    id: "hologram",
    name: "ESP Holograma",
    status: "online",
    lastPing: "1s atrás",
    routes: ["Motor", "Animação", "LEDs"],
  },
];

function uid() {
  return Math.random().toString(16).slice(2);
}

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const initialSteps: PlaylistStep[] = [
  {
    id: "s1",
    title: "Abertura • Hype",
    type: "presentation",
    durationMs: 2500,
    bpm: 128,
    palette: "blue",
    trackTitle: "—",
    genre: "—",
    audioFile: "voice_intro.mp3",
    hologram: "hype",
    leds: "contorno + brilho",
    portal: "pulse",
    esp: [
      { target: "portal", type: "portal_mode", payload: { mode: "pulse" } },
      { target: "broadcast", type: "set_palette", payload: { name: "blue" } },
    ],
  },
  {
    id: "s2",
    title: "Pagode Pesado",
    type: "music",
    durationMs: 18000,
    bpm: 128,
    palette: "blue",
    trackTitle: "Set Pagode 01",
    genre: "Pagode",
    audioFile: "pagode_01.mp3",
    hologram: "pagode_dance",
    leds: "VU + contornos",
    portal: "steady",
    esp: [
      { target: "right", type: "set_mode", payload: { mode: "vu" } },
      { target: "left", type: "set_mode", payload: { mode: "vu" } },
      {
        target: "hologram",
        type: "hologram_behavior",
        payload: { behavior: "pagode_dance" },
      },
    ],
  },
  {
    id: "s3",
    title: "Chamar Galera",
    type: "presentation",
    durationMs: 3500,
    bpm: 120,
    palette: "purple",
    trackTitle: "—",
    genre: "—",
    audioFile: "call_crowd.mp3",
    hologram: "chamar_galera",
    leds: "estrelas/flocos",
    portal: "pulse",
    esp: [
      { target: "portal", type: "portal_mode", payload: { mode: "pulse" } },
      {
        target: "hologram",
        type: "hologram_behavior",
        payload: { behavior: "chamar_galera" },
      },
    ],
  },
];

export default function Page() {
  const [mode, setMode] = useState<UiMode>("operator");

  const [steps, setSteps] = useState<PlaylistStep[]>(initialSteps);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // timer de execução (simulação)
  const [elapsedMs, setElapsedMs] = useState(0);

  // modais
  const [addOpen, setAddOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // form state (add/edit)
  const [draft, setDraft] = useState<PlaylistStep>(() => ({
    id: uid(),
    title: "",
    type: "music",
    durationMs: 12000,
    bpm: 128,
    palette: "blue",
    trackTitle: "",
    genre: "",
    audioFile: "",
    hologram: "",
    leds: "",
    portal: "",
    esp: [],
  }));

  const current = steps[activeIndex] || steps[0];
  const bpm = current?.bpm || 120;

  const progress = current?.durationMs ? elapsedMs / current.durationMs : 0;
  const paletteName = current?.palette || "blue";

  // tick de execução
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setElapsedMs((ms) => ms + 200);
    }, 200);
    return () => clearInterval(t);
  }, [isPlaying]);

  // quando termina step -> próximo
  useEffect(() => {
    if (!isPlaying) return;
    if (!current) return;
    if (elapsedMs >= current.durationMs) {
      // auto-skip
      setElapsedMs(0);
      setActiveIndex((i) => {
        const next = i + 1;
        if (next >= steps.length) return 0;
        return next;
      });
    }
  }, [elapsedMs, isPlaying, current, steps.length]);

  function toggleMode() {
    setMode((m) => (m === "operator" ? "show" : "operator"));
  }

  function play() {
    setIsPlaying(true);
  }

  function pause() {
    setIsPlaying(false);
  }

  function skip() {
    setElapsedMs(0);
    setActiveIndex((i) => (i + 1 >= steps.length ? 0 : i + 1));
  }

  function playStep(index: number) {
    setActiveIndex(index);
    setElapsedMs(0);
    setIsPlaying(true);
  }

  // progress por item: só o ativo mostra progresso
  function progressByIndex(index: number) {
    if (index !== activeIndex) return 0;
    return progress;
  }

  // --- MODAIS (AÇÕES REAIS) ---
  function openAdd() {
    setDraft({
      id: uid(),
      title: "",
      type: "music",
      durationMs: 12000,
      bpm: 128,
      palette: "blue",
      trackTitle: "",
      genre: "",
      audioFile: "",
      hologram: "",
      leds: "",
      portal: "",
      esp: [],
    });
    setAddOpen(true);
  }

  function submitAdd() {
    if (!draft.title.trim()) return;
    setSteps((prev) => [...prev, { ...draft, id: uid() }]);
    setAddOpen(false);
  }

  function openEdit(index: number) {
    const s = steps[index];
    setDraft(JSON.parse(JSON.stringify(s)));
    setEditIndex(index);
  }

  function submitEdit() {
    if (editIndex === null) return;
    if (!draft.title.trim()) return;
    setSteps((prev) =>
      prev.map((s, i) => (i === editIndex ? { ...draft } : s))
    );
    setEditIndex(null);
  }

  function openDelete(index: number) {
    setDeleteIndex(index);
  }

  function confirmDelete() {
    if (deleteIndex === null) return;
    setSteps((prev) => prev.filter((_, i) => i !== deleteIndex));
    // ajusta activeIndex se necessário
    setActiveIndex((ai) => {
      if (deleteIndex < ai) return Math.max(0, ai - 1);
      if (deleteIndex === ai) return 0;
      return ai;
    });
    setElapsedMs(0);
    setDeleteIndex(null);
  }

  // Layout: página mais bonita (hero + cards)
  return (
    <main
      className={`min-h-screen ${mode === "show" ? "ui-show" : "ui-operator"}`}
    >
      {/* background moderninho */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 400px at 20% 0%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(800px 400px at 90% 10%, rgba(124,58,237,0.10), transparent 60%), rgb(var(--bg-main))",
        }}
      />

      <div className="px-4 py-4 space-y-4">
        <Header mode={mode} onToggleMode={toggleMode} />

        <PlayerControls
          mode={mode}
          isPlaying={isPlaying}
          bpm={bpm}
          onPlay={play}
          onPause={pause}
          onSkip={skip}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Playlist maior */}
          <div className="lg:col-span-8">
            <PlaylistView
              steps={steps}
              activeIndex={activeIndex}
              mode={mode}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={openDelete}
              onPlayStep={playStep}
              progressByIndex={progressByIndex}
            />
          </div>

          {/* Status menor porém moderno */}
          <div className="lg:col-span-4 space-y-4">
            <StatusPanel
              mode={mode}
              isPlaying={isPlaying}
              currentTitle={current?.title || "—"}
              currentType={current?.type || "—"}
              bpm={bpm}
              progress={progress}
              elapsedLabel={formatMs(elapsedMs)}
              totalLabel={formatMs(current?.durationMs || 0)}
              paletteName={paletteName}
            />
            <EspStatusPanel nodes={espNodes} />
          </div>
        </div>
      </div>

      {/* MODAL ADD */}
      <Modal
        open={addOpen}
        title="Adicionar Step"
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitAdd}>
              Salvar
            </Button>
          </>
        }
      >
        <StepForm draft={draft} setDraft={setDraft} />
      </Modal>

      {/* MODAL EDIT */}
      <Modal
        open={editIndex !== null}
        title="Editar Step"
        onClose={() => setEditIndex(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditIndex(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submitEdit}>
              Salvar alterações
            </Button>
          </>
        }
      >
        <StepForm draft={draft} setDraft={setDraft} />
      </Modal>

      {/* MODAL DELETE */}
      <Modal
        open={deleteIndex !== null}
        title="Confirmar remoção"
        onClose={() => setDeleteIndex(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteIndex(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remover
            </Button>
          </>
        }
      >
        <div className="text-sm text-[rgb(var(--text-muted))]">
          Tem certeza que deseja remover este step?
        </div>
        <div className="mt-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4 text-sm">
          <div className="font-semibold text-[rgb(var(--text-main))]">
            {deleteIndex !== null ? steps[deleteIndex]?.title : "—"}
          </div>
          <div className="mt-1 text-[rgb(var(--text-muted))]">
            Essa ação não pode ser desfeita.
          </div>
        </div>
      </Modal>
    </main>
  );
}

// --- Form do step (local) ---
function StepForm({
  draft,
  setDraft,
}: {
  draft: PlaylistStep;
  setDraft: (v: PlaylistStep) => void;
}) {
  const inputBase =
    "w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm text-[rgb(var(--text-main))] outline-none focus:ring-2";
  const label =
    "text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <div className={label}>Título</div>
        <input
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Ex: Pagode Pesado / Chamar Galera"
        />
      </div>

      <div>
        <div className={label}>Tipo</div>
        <select
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.type}
          onChange={(e) => setDraft({ ...draft, type: e.target.value as any })}
        >
          <option value="music">music</option>
          <option value="presentation">presentation</option>
          <option value="pause">pause</option>
        </select>
      </div>

      <div>
        <div className={label}>Paleta</div>
        <select
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.palette || "blue"}
          onChange={(e) =>
            setDraft({ ...draft, palette: e.target.value as any })
          }
        >
          <option value="blue">blue</option>
          <option value="purple">purple</option>
          <option value="green">green</option>
          <option value="orange">orange</option>
        </select>
      </div>

      <div>
        <div className={label}>Duração (ms)</div>
        <input
          type="number"
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.durationMs}
          onChange={(e) =>
            setDraft({ ...draft, durationMs: Number(e.target.value || 0) })
          }
        />
      </div>

      <div>
        <div className={label}>BPM</div>
        <input
          type="number"
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.bpm || 120}
          onChange={(e) =>
            setDraft({ ...draft, bpm: Number(e.target.value || 0) })
          }
        />
      </div>

      <div>
        <div className={label}>Track title</div>
        <input
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.trackTitle || ""}
          onChange={(e) => setDraft({ ...draft, trackTitle: e.target.value })}
          placeholder="Ex: Set Pagode 01"
        />
      </div>

      <div>
        <div className={label}>Gênero</div>
        <input
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.genre || ""}
          onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
          placeholder="Ex: Pagode"
        />
      </div>

      <div className="md:col-span-2">
        <div className={label}>Arquivo de áudio (local)</div>
        <input
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.audioFile || ""}
          onChange={(e) => setDraft({ ...draft, audioFile: e.target.value })}
          placeholder="Ex: pagode_01.mp3"
        />
      </div>

      <div>
        <div className={label}>Holograma</div>
        <input
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.hologram || ""}
          onChange={(e) => setDraft({ ...draft, hologram: e.target.value })}
          placeholder="Ex: pagode_dance"
        />
      </div>

      <div>
        <div className={label}>LEDs</div>
        <input
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.leds || ""}
          onChange={(e) => setDraft({ ...draft, leds: e.target.value })}
          placeholder="Ex: VU + contornos"
        />
      </div>

      <div className="md:col-span-2">
        <div className={label}>Portal</div>
        <input
          className={`${inputBase} focus:ring-[rgba(37,99,235,0.25)]`}
          value={draft.portal || ""}
          onChange={(e) => setDraft({ ...draft, portal: e.target.value })}
          placeholder="Ex: pulse / steady"
        />
      </div>

      <div className="md:col-span-2 text-xs text-[rgb(var(--text-faint))]">
        Eventos ESP serão editáveis depois (vamos colocar um editor visual em
        seguida).
      </div>
    </div>
  );
}
