"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Header from "../components/Header";
import PlayerControls from "../components/PlayerControls";
import StatusPanel from "../components/StatusPanel";
import Modal from "../components/Modal";
import Button from "../components/Button";
import { UiMode } from "../utils/uiMode";
import { PlaylistStep } from "../types/playlist";
import * as api from "../services/api";
import { connectSocket } from "../services/socket";
import PlaylistView from "@/components/PaylistView";
import EspStatusPanel from "@/components/ESPStatusPanel";

function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

const emptyDraft: PlaylistStep = {
  id: "",
  title: "",
  type: "music",
  durationMs: 12000,
  bpm: 120,
  palette: "blue",
  trackTitle: "",
  genre: "",
  audioFile: "",
  hologram: "",
  leds: "",
  portal: "",
  esp: [],
};

export default function Page() {
  const [mode, setMode] = useState<UiMode>("operator");

  // Data from backend
  const [steps, setSteps] = useState<PlaylistStep[]>([]);
  const [espNodes, setEspNodes] = useState<api.EspNode[]>([]);

  const [status, setStatus] = useState<api.PlayerStatus>({
    isPlaying: false,
    activeIndex: 0,
    elapsedMs: 0,
    bpm: 120,
    palette: "blue",
    currentTitle: "—",
    currentType: "—",
  });

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PlaylistStep>(emptyDraft);

  // Keep a ref to avoid stale closures
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Initial load + periodic refresh fallback
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      try {
        const [pl, st, esp] = await Promise.all([
          api.getPlaylist(),
          api.getStatus(),
          api.getEspStatus(),
        ]);

        if (!mounted) return;
        setSteps(pl.steps as PlaylistStep[]);
        setStatus(st);
        setEspNodes(esp.nodes);
      } catch (e) {
        // leave UI as-is; optionally show toast later
        console.error(e);
      }
    }

    loadAll();

    // fallback polling (production safe)
    const interval = setInterval(loadAll, 1500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // WebSocket realtime (overrides polling behavior smoothly)
  useEffect(() => {
    const sock = connectSocket((msg) => {
      // backend can emit:
      // { type: "status", data: PlayerStatus }
      // { type: "playlist", data: { steps: PlaylistStep[] } }
      // { type: "esp", data: { nodes: EspNode[] } }
      if (!msg?.type) return;

      if (msg.type === "status" && msg.data) setStatus(msg.data);
      if (msg.type === "playlist" && msg.data?.steps) setSteps(msg.data.steps);
      if (msg.type === "esp" && msg.data?.nodes) setEspNodes(msg.data.nodes);
    });

    return () => sock.close();
  }, []);

  const activeIndex = Math.max(
    0,
    Math.min(status.activeIndex, Math.max(steps.length - 1, 0))
  );
  const currentStep = steps[activeIndex];

  const progress = currentStep?.durationMs
    ? status.elapsedMs / currentStep.durationMs
    : 0;

  function toggleMode() {
    setMode((m) => (m === "operator" ? "show" : "operator"));
  }

  // ---------- Real actions (backend) ----------
  async function onPlay() {
    await api.play();
  }

  async function onPause() {
    await api.pause();
  }

  async function onSkip() {
    await api.skip();
  }

  async function onPlayStep(index: number) {
    await api.playStep(index);
  }

  // ---------- Modals actions ----------
  function openAdd() {
    setDraft({ ...emptyDraft, id: "" });
    setAddOpen(true);
  }

  async function submitAdd() {
    if (!draft.title.trim()) return;
    await api.addStep(draft);
    setAddOpen(false);
  }

  function openEdit(index: number) {
    const s = steps[index];
    if (!s) return;
    setDraft(JSON.parse(JSON.stringify(s)));
    setEditIndex(index);
  }

  async function submitEdit() {
    if (editIndex === null) return;
    if (!draft.title.trim()) return;
    await api.editStep(editIndex, draft);
    setEditIndex(null);
  }

  function openDelete(index: number) {
    setDeleteIndex(index);
  }

  async function confirmDelete() {
    if (deleteIndex === null) return;
    await api.deleteStep(deleteIndex);
    setDeleteIndex(null);
  }

  // progress per item
  function getProgress(index: number) {
    if (index !== activeIndex) return 0;
    return progress;
  }

  return (
    <main
      className={`min-h-screen ${mode === "show" ? "ui-show" : "ui-operator"}`}
    >
      {/* Background suave */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 400px at 20% 0%, rgba(37,99,235,0.18), transparent 60%), radial-gradient(800px 400px at 90% 10%, rgba(124,58,237,0.10), transparent 60%), rgb(var(--bg-main))",
        }}
      />

      {/* Layout: quase tela inteira + padding mínimo */}
      <div className="px-4 py-4 space-y-4">
        <Header mode={mode} onToggleMode={toggleMode} />

        <PlayerControls
          mode={mode}
          isPlaying={status.isPlaying}
          bpm={status.bpm || 120}
          onPlay={onPlay}
          onPause={onPause}
          onSkip={onSkip}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <PlaylistView
              steps={steps}
              activeIndex={activeIndex}
              mode={mode}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={openDelete}
              onPlayStep={onPlayStep}
              getProgress={getProgress}
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            <StatusPanel
              mode={mode}
              isPlaying={status.isPlaying}
              currentTitle={status.currentTitle || currentStep?.title || "—"}
              currentType={status.currentType || currentStep?.type || "—"}
              bpm={status.bpm || currentStep?.bpm || 120}
              progress={progress}
              elapsedLabel={formatMs(status.elapsedMs || 0)}
              totalLabel={formatMs(currentStep?.durationMs || 0)}
              paletteName={status.palette || currentStep?.palette || "blue"}
            />

            <EspStatusPanel nodes={espNodes as any} />
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      <Modal
        open={addOpen}
        title="Adicionar Step a partir do YouTube"
        onClose={() => setAddOpen(false)}
      >
        <StepForm
          onSubmit={async (payload) => {
            await api.addStepFromYoutube(payload);
            setAddOpen(false);
          }}
        />
      </Modal>

      {/* EDIT MODAL */}
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

      {/* DELETE MODAL */}
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

function StepForm({
  onSubmit,
}: {
  onSubmit: (payload: {
    title: string;
    type: string;
    palette: string;
    genre: string;
    youtubeUrl: string;
    useAI: boolean;
  }) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("music");
  const [palette, setPalette] = useState("blue");
  const [genre, setGenre] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [useAI, setUseAI] = useState(true);

  const input =
    "w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.25)]";
  const label =
    "text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ title, type, palette, genre, youtubeUrl, useAI });
      }}
    >
      <div>
        <div className={label}>Nome do Step</div>
        <input
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Pagode Pesado"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className={label}>Tipo</div>
          <select
            className={input}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="music">music</option>
            <option value="presentation">presentation</option>
            <option value="pause">pause</option>
          </select>
        </div>

        <div>
          <div className={label}>Paleta</div>
          <select
            className={input}
            value={palette}
            onChange={(e) => setPalette(e.target.value)}
          >
            <option value="blue">blue</option>
            <option value="purple">purple</option>
            <option value="green">green</option>
            <option value="orange">orange</option>
          </select>
        </div>
      </div>

      <div>
        <div className={label}>Gênero</div>
        <input
          className={input}
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Ex: Pagode"
        />
      </div>

      <div>
        <div className={label}>Link do YouTube</div>
        <input
          className={input}
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://youtube.com/..."
          required
        />
        <p className="mt-1 text-xs text-[rgb(var(--text-muted))]">
          O áudio será baixado e analisado automaticamente
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={useAI}
          onChange={(e) => setUseAI(e.target.checked)}
        />
        <span className="text-sm text-[rgb(var(--text-muted))]">
          Usar IA para otimizar o show de LEDs
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="primary" type="submit">
          Criar Step
        </Button>
      </div>
    </form>
  );
}

// Também teremos no formulario, mas somente readonly, os campos que serao preenchidos pelo sistema. Eles sao:
// Duração
// BPM
// TrackTitle
// Events
// Leds
// Hologramas

// Obs. Em todos os casos todos os leds devem receber comandos.
