import { useRef, useState } from "react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import * as XLSX from "xlsx";
import { ImageDown, Plus, RotateCcw, Send, Shuffle, Trash2, Upload } from "lucide-react";
import { store, useColaboradores } from "@/lib/cg-store";
import type { Colaborador } from "@/lib/cg-types";
import { cn } from "@/lib/utils";

interface EscalaRow {
  id: string;
  posto: string;
  agente: string;
  cafe: string;
  almoco: string;
}

const CAFE_OPTIONS = ["08:00", "08:30", "09:00"];
const ALMOCO_OPTIONS = ["10:00", "10:30", "11:00", "11:30", "12:00"];

/**
 * Default layout (12 postos):
 *  - 3 Linha de bloqueio · 1 SSO · 2 Mezanino · 2 Plataforma 6/7
 *  - 2 Plataforma 3 · 2 Ronda / Apoiar postos (máximo 2 na ronda livre)
 * Café (30min): 5 às 08:00 · 6 às 08:30 · 1 às 09:00
 * Almoço (1h): 2 às 10:00 · 3 às 10:30 · 3 às 11:00 · 3 às 11:30 · 1 às 12:00
 */
const POSTOS_DEFAULT = [
  "Linha de bloqueio",
  "Linha de bloqueio",
  "Linha de bloqueio",
  "SSO",
  "Mezanino",
  "Mezanino",
  "Plataforma 6/7",
  "Plataforma 6/7",
  "Plataforma 3",
  "Plataforma 3",
  "Ronda / Apoiar postos",
  "Ronda / Apoiar postos",
];

const CAFE_SEQ = [
  "08:00", "08:00", "08:00", "08:00", "08:00", // 5
  "08:30", "08:30", "08:30", "08:30", "08:30", "08:30", // 6
  "09:00", // 1
];

const ALMOCO_SEQ = [
  "10:00", "10:00", // 2
  "10:30", "10:30", "10:30", // 3
  "11:00", "11:00", "11:00", // 3
  "11:30", "11:30", "11:30", // 3
  "12:00", // 1
];

function buildDefault(): EscalaRow[] {
  return POSTOS_DEFAULT.map((posto, i) => ({
    id: crypto.randomUUID(),
    posto,
    agente: "",
    cafe: CAFE_SEQ[i] ?? "08:30",
    almoco: ALMOCO_SEQ[i] ?? "11:00",
  }));
}

/** Take the first available name from the priority pools (mutates them). */
function pick(pools: string[][]): string {
  for (const p of pools) {
    if (p.length) return p.shift()!;
  }
  return "";
}

/**
 * Distribute working (T) collaborators across the posts + stagger café/almoço.
 * Regra de folga: quem voltou de folga há 2 dias ("2d") vai para a Linha de
 * bloqueio; quem voltou há 1 dia ("1d") vai para a SSO.
 */
function buildDistributed(colabs: Colaborador[]): EscalaRow[] {
  const working = colabs.filter((c) => c.status === "T");
  const p2 = working.filter((c) => c.retorno === "2d").map((c) => c.name);
  const p1 = working.filter((c) => c.retorno === "1d").map((c) => c.name);
  const p0 = working.filter((c) => !c.retorno).map((c) => c.name);

  // Postos fixos: exatamente os definidos em POSTOS_DEFAULT
  // Ronda área livre: apenas 2 vagas (já incluídas no POSTOS_DEFAULT)
  // Se tiver mais gente que postos, os últimos ficam como apoio geral
  const totalPostos = POSTOS_DEFAULT.length; // 12 postos fixos
  const postos = working.length <= totalPostos
    ? POSTOS_DEFAULT.slice(0, Math.max(working.length, 1))
    : [
        ...POSTOS_DEFAULT,
        ...Array.from({ length: Math.min(working.length - totalPostos, 3) }, () => "Apoio geral"),
      ];

  return postos.map((posto, i) => {
    let agente: string;
    if (posto === "Linha de bloqueio") agente = pick([p2, p0, p1]);
    else if (posto === "SSO") agente = pick([p1, p0, p2]);
    else agente = pick([p0, p2, p1]);
    return {
      id: crypto.randomUUID(),
      posto,
      agente,
      cafe: CAFE_SEQ[i] ?? "08:30",
      almoco: ALMOCO_SEQ[i] ?? "11:00",
    };
  });
}

const HEADER_WORDS = new Set([
  "NOME", "AGENTE", "COLABORADOR", "STATUS", "POSTO", "ESCALA",
  "SITUACAO", "SITUAÇÃO", "T/F", "TF", "FUNCAO", "FUNÇÃO",
]);

function normStatus(s: string): "T" | "F" | null {
  const up = s.trim().toUpperCase();
  if (up === "T" || up === "TRAB" || up === "TRABALHA" || up === "TRABALHO") return "T";
  if (up === "F" || up === "FOLGA" || up === "FOLGA." || up === "OFF") return "F";
  return null;
}

/** Parse a sheet (array of rows) into colaboradores by finding a name + a T/F marker. */
function parseRows(rows: unknown[][]): Colaborador[] {
  const out: Colaborador[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    let status: "T" | "F" | null = null;
    let name = "";
    let bestLen = 0;
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const s = String(cell).trim();
      if (!s) continue;
      const st = normStatus(s);
      if (st) {
        status = st;
        continue;
      }
      const up = s.toUpperCase();
      if (HEADER_WORDS.has(up)) continue;
      // A name: has at least 2 letters, not a pure number.
      if (/[a-zA-ZÀ-ÿ]{2,}/.test(s) && s.length > bestLen) {
        name = s;
        bestLen = s.length;
      }
    }
    if (name && status) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: crypto.randomUUID(), name, status });
    }
  }
  return out;
}

const cellInput =
  "w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60";

export function EscalaEditor() {
  const colaboradores = useColaboradores();
  const [rows, setRows] = useState<EscalaRow[]>(buildDefault);
  const [exporting, setExporting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function update(id: string, patch: Partial<EscalaRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), posto: "", agente: "", cafe: "08:30", almoco: "11:00" },
    ]);
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }
  function reset() {
    setRows(buildDefault());
    toast.success("Escala restaurada para o padrão");
  }

  /** Redistribute the working (T) collaborators automatically across posts. */
  // State for extras modal
  const [extrasModal, setExtrasModal] = useState<{
    extras: string[];
    onConfirm: (assignments: Record<string, string>) => void;
  } | null>(null);
  const [extraAssignments, setExtraAssignments] = useState<Record<string, string>>({});

  function autoDistribute() {
    const working = colaboradores.filter((c) => c.status === "T");
    if (working.length === 0) {
      toast.error("Nenhum agente marcado como T (trabalha)");
      return;
    }

    const totalPostos = POSTOS_DEFAULT.length;

    if (working.length > totalPostos) {
      // There are more people than posts - ask where to send extras
      const extras = working.slice(totalPostos).map((c) => c.name);
      const initialAssignments: Record<string, string> = {};
      extras.forEach((name) => { initialAssignments[name] = ""; });
      setExtraAssignments(initialAssignments);
      setExtrasModal({
        extras,
        onConfirm: (assignments) => {
          // Build distributed with extras assigned to chosen posts
          const rows = buildDistributed(colaboradores);
          extras.forEach((name) => {
            const posto = assignments[name];
            if (posto) {
              rows.push({
                id: crypto.randomUUID(),
                posto,
                agente: name,
                cafe: "09:00",
                almoco: "12:00",
              });
            }
          });
          setRows(rows);
          setExtrasModal(null);
          toast.success(`Escala distribuída para ${working.length} agente(s)`);
        },
      });
      return;
    }

    setRows(buildDistributed(colaboradores));
    toast.success(`Escala distribuída para ${working.length} agente(s)`);
  }

  /** Import a spreadsheet, detect T/F, load the team and distribute. */
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed: Colaborador[] = [];
      const seen = new Set<string>();
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rowsArr = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
        for (const c of parseRows(rowsArr)) {
          const key = c.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          parsed.push(c);
        }
      }
      if (parsed.length === 0) {
        toast.error("Não encontrei nomes com T/F na planilha");
        return;
      }
      store.setColaboradores(parsed);
      const working = parsed.filter((c) => c.status === "T");
      setRows(buildDistributed(parsed));
      const folgas = parsed.length - working.length;
      toast.success(
        `Importado: ${working.length} trabalham · ${folgas} de folga — escala distribuída`,
      );
    } catch {
      toast.error("Não foi possível ler a planilha");
    }
  }

  async function generateBlob(): Promise<Blob | null> {
    if (!exportRef.current) return null;
    const dataUrl = await toPng(exportRef.current, {
      pixelRatio: 2,
      backgroundColor: "#080C12",
      cacheBust: true,
    });
    const res = await fetch(dataUrl);
    return res.blob();
  }

  async function exportImage() {
    setExporting(true);
    try {
      const blob = await generateBlob();
      if (!blob) return;
      const data = new Date().toLocaleDateString("pt-BR");
      const link = document.createElement("a");
      link.download = `escala-${data.replace(/\//g, "-")}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Imagem da escala gerada");
    } catch {
      toast.error("Não foi possível gerar a imagem");
    } finally {
      setExporting(false);
    }
  }

  async function shareWhatsApp() {
    setExporting(true);
    try {
      const blob = await generateBlob();
      if (!blob) return;
      const data = new Date().toLocaleDateString("pt-BR");
      const fileName = `escala-${data.replace(/\//g, "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        // Native share sheet: the image goes in already attached (real image,
        // not just a download link). The one remaining tap is picking WhatsApp
        // and then the contact — browsers don't allow a site to pick a specific
        // WhatsApp contact for you, that step always needs a human tap.
        await nav.share({
          files: [file],
          title: "Escala operacional",
          text: `Escala operacional — ${data}`,
        });
        toast.success("Escolha o WhatsApp e o contato na tela que abriu");
        return;
      }

      // Fallback for browsers without file-sharing support: just download the image.
      const link = document.createElement("a");
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Imagem baixada — anexe no WhatsApp");
    } catch {
      toast.error("Não foi possível compartilhar");

    } finally {
      setExporting(false);
    }
  }

  const totalT = colaboradores.filter((c) => c.status === "T").length;
  const totalF = colaboradores.length - totalT;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Escala operacional</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium"
          >
            <Plus className="size-3.5" /> Linha
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium"
          >
            <RotateCcw className="size-3.5" /> Padrão
          </button>
        </div>
      </div>

      {/* Spreadsheet import */}
      <div className="rounded-xl border border-dashed border-border bg-secondary/40 p-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={onFile}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Upload className="size-3.5" /> Anexar planilha
          </button>
          <button
            type="button"
            onClick={autoDistribute}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold"
          >
            <Shuffle className="size-3.5" /> Distribuir sozinho
          </button>
          {colaboradores.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {totalT} trabalham · {totalF} de folga
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Envie uma planilha (Excel/CSV) com os nomes e a marcação <b>T</b> (trabalha)
          ou <b>F</b> (folga). O app carrega a equipe e distribui os postos e horários
          de café/almoço automaticamente.
        </p>
      </div>

      {/* Extras Modal */}
      {extrasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl">
            <h3 className="mb-1 text-base font-bold text-foreground">Agentes extras</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Há mais agentes do que postos disponíveis. Escolha para qual posto enviar cada um:
            </p>
            <div className="space-y-3">
              {extrasModal.extras.map((name) => (
                <div key={name}>
                  <p className="mb-1 text-xs font-semibold text-foreground">{name}</p>
                  <select
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                    value={extraAssignments[name] || ""}
                    onChange={(e) =>
                      setExtraAssignments((prev) => ({ ...prev, [name]: e.target.value }))
                    }
                  >
                    <option value="">Selecione um posto...</option>
                    {POSTOS_DEFAULT.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="Apoio geral">Apoio geral</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setExtrasModal(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-semibold text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => extrasModal.onConfirm(extraAssignments)}
                disabled={extrasModal.extras.some((n) => !extraAssignments[n])}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captured area */}
      <div ref={tableRef} className="rounded-2xl border border-border bg-background p-4">
        <div className="mb-3 text-center">
          <p className="text-sm font-bold tracking-tight">ESCALA OPERACIONAL</p>
          <p className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="-mx-1 overflow-x-auto px-1">
          <div className="min-w-[600px] overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[200px_165px_85px_90px] bg-secondary text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="px-2 py-2">Posto</div>
              <div className="border-l border-border px-2 py-2">Agente</div>
              <div className="border-l border-border px-1 py-2 text-center">Café</div>
              <div className="border-l border-border px-1 py-2 text-center">Almoço</div>
            </div>
            {rows.map((r) => (
              <div
                key={r.id}
                className="group grid grid-cols-[200px_165px_85px_90px] border-t border-border"
              >
                <div className="px-2 py-1.5">
                  <input
                    className={cn(cellInput, "text-sm")}
                    value={r.posto}
                    placeholder="Posto"
                    onChange={(e) => update(r.id, { posto: e.target.value })}
                  />
                </div>
                <div className="relative border-l border-border px-2 py-1.5">
                  <select
                    className={cn(cellInput, "appearance-none pr-4 text-sm")}
                    value={r.agente}
                    onChange={(e) => update(r.id, { agente: e.target.value })}
                  >
                    <option value="">— selecionar —</option>
                    {colaboradores.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {/* allow keeping a custom name that is no longer in the list */}
                    {r.agente && !colaboradores.some((c) => c.name === r.agente) && (
                      <option value={r.agente}>{r.agente}</option>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
                    aria-label="Remover linha"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="border-l border-border px-1 py-1.5">
                  <select
                    className={cn(cellInput, "appearance-none text-center text-sm")}
                    value={r.cafe}
                    onChange={(e) => update(r.id, { cafe: e.target.value })}
                  >
                    {CAFE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="border-l border-border px-1 py-1.5">
                  <select
                    className={cn(cellInput, "appearance-none text-center text-sm")}
                    value={r.almoco}
                    onChange={(e) => update(r.id, { almoco: e.target.value })}
                  >
                    {ALMOCO_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] text-muted-foreground/70">
          Arraste pro lado para ver todas as colunas
        </p>

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Café 30min · Almoço 1h
        </p>
      </div>

      {/* Hidden, plain-text, fixed-width version used ONLY for the exported image.
          Kept separate from the editable table above so the export never depends
          on scroll position or form-control quirks — it always renders complete. */}
      <div style={{ position: "fixed", top: 0, left: -9999, pointerEvents: "none" }}>
        <div ref={exportRef} className="w-[640px] bg-background p-5" style={{ backgroundColor: "#080C12" }}>
          <div className="mb-3 text-center">
            <p className="text-base font-bold tracking-tight text-foreground">ESCALA OPERACIONAL</p>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="grid grid-cols-[220px_180px_100px_110px] bg-secondary text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <div className="px-2 py-2">Posto</div>
              <div className="border-l border-border px-2 py-2">Agente</div>
              <div className="border-l border-border px-2 py-2 text-center">Café</div>
              <div className="border-l border-border px-2 py-2 text-center">Almoço</div>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[220px_180px_100px_110px] border-t border-border">
                <div className="px-2 py-2 text-sm text-foreground">{r.posto || "—"}</div>
                <div className="border-l border-border px-2 py-2 text-sm text-foreground">{r.agente || "—"}</div>
                <div className="border-l border-border px-2 py-2 text-center text-sm text-foreground">{r.cafe}</div>
                <div className="border-l border-border px-2 py-2 text-center text-sm text-foreground">{r.almoco}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Café 30min · Almoço 1h</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={exportImage}
          disabled={exporting}
          className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3.5 text-sm font-semibold disabled:opacity-60"
        >
          <ImageDown className="size-4" />
          {exporting ? "Gerando..." : "Salvar imagem"}
        </button>
        <button
          type="button"
          onClick={shareWhatsApp}
          disabled={exporting}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Send className="size-4" />
          {exporting ? "Gerando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
