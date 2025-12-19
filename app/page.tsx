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

  async function handleCreateStep(formData: FormData) {
    // fecha modal imediatamente
    setAddOpen(false);

    const type = String(formData.get("type"));

    if (type === "presentation") {
      await api.addPresentation(formData);
      return;
    }

    if (type === "music") {
      await api.addStepFromYoutube({
        title: String(formData.get("title")),
        type: "music",
        palette: String(formData.get("palette")),
        genre: String(formData.get("genre") || ""),
        youtubeUrl: String(formData.get("youtubeUrl")),
        useAI: Boolean(formData.get("useAI")),
      });
      return;
    }

    if (type === "pause") {
      await api.addPause({
        title: String(formData.get("title")),
        durationMs: Number(formData.get("durationMs") || 3000),
      });
    }
  }

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
      if (msg.type === "playlist_progress") {
        setSteps((prev) =>
          prev.map((s) =>
            s.id === msg.data.stepId ? { ...s, progress: msg.data.progress } : s
          )
        );
      }

      if (msg.type === "playlist_ready") {
        setSteps((prev) =>
          prev.map((s) => (s.id === msg.data.step.id ? msg.data.step : s))
        );
      }

      if (msg.type === "playlist_error") {
        setSteps((prev) =>
          prev.map((s) =>
            s.id === msg.data.stepId ? { ...s, status: "error" } : s
          )
        );
      }
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
        <StepForm onSubmit={handleCreateStep} />
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

function StepForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [type, setType] = useState<"music" | "presentation" | "pause">("music");
  const [useAI, setUseAI] = useState(true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  }

  const input =
    "w-full rounded-xl border border-[rgb(var(--border))] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.25)]";
  const label =
    "text-xs font-semibold tracking-widest text-[rgb(var(--text-faint))] uppercase";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* TÍTULO */}
      <div>
        <div className={label}>Nome do Step</div>
        <input
          name="title"
          className={input}
          placeholder="Ex: Chamar galera"
          required
        />
      </div>

      {/* TIPO */}
      <div>
        <div className={label}>Tipo</div>
        <select
          name="type"
          className={input}
          value={type}
          onChange={(e) => setType(e.target.value as any)}
        >
          <option value="music">music</option>
          <option value="presentation">presentation</option>
          <option value="pause">pause</option>
        </select>
      </div>

      {/* PALETA */}
      <div>
        <div className={label}>Paleta</div>
        <select name="palette" className={input}>
          <option value="blue">blue</option>
          <option value="purple">purple</option>
          <option value="green">green</option>
          <option value="orange">orange</option>
        </select>
      </div>

      {/* MUSIC */}
      {type === "music" && (
        <>
          <div>
            <div className={label}>Gênero</div>
            <input name="genre" className={input} placeholder="Ex: Pagode" />
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

          <label className="flex items-center gap-2 text-sm">
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

      {/* PRESENTATION */}
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
              JSON no formato:
              <code className="ml-1 text-[rgb(var(--text-main))]">
                timeline → atMs / cmd / target / payload
              </code>
            </p>
          </div>
        </>
      )}

      {/* PAUSE */}
      {type === "pause" && (
        <div>
          <div className={label}>Duração (ms)</div>
          <input
            type="number"
            name="durationMs"
            className={input}
            defaultValue={3000}
          />
        </div>
      )}

      {/* SUBMIT */}
      <div className="flex justify-end pt-4">
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
