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

const NATY_WHATSAPP_NUMBER = "5511954753502"; // Naty · 11 95475-3502
const FOEGER_WHATSAPP_NUMBER = "5511973852463"; // Foeger · 11 97385-2463

const CAFE_OPTIONS = ["08:00", "08:30", "09:00"];
const ALMOCO_OPTIONS = ["10:00", "10:30", "11:00", "11:30", "12:00"];

/**
 * Default layout (12 postos):
 *  - 3 Linha de bloqueio · 1 SSO · 2 Mezanino · 2 Plataforma 6/7
 *  - 2 Plataforma 3 · 2 Ronda / Apoiar postos
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

  const extras = Math.max(0, working.length - POSTOS_DEFAULT.length);
  const postos = [
    ...POSTOS_DEFAULT,
    ...Array.from({ length: extras }, () => "Apoiar postos / Ronda área livre"),
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
  function autoDistribute() {
    const working = colaboradores.filter((c) => c.status === "T");
    if (working.length === 0) {
      toast.error("Nenhum agente marcado como T (trabalha)");
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
    if (!tableRef.current) return null;
    const dataUrl = await toPng(tableRef.current, {
      pixelRatio: 2,
      backgroundColor: "#080C12",
      cacheBust: true,
      width: 760, // render wider than the mobile screen so nothing gets clipped
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

  async function shareWhatsApp(number: string, recipient: string) {
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
          text: `Escala operacional — ${data} — para ${recipient}`,
        });
        toast.success(`Escolha WhatsApp e o contato de ${recipient} na tela que abriu`);
        return;
      }

      // Fallback for browsers without file-sharing support: download the image
      // and open the specific chat directly so at least the recipient is right.
      const link = document.createElement("a");
      link.download = fileName;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      const msg = encodeURIComponent(
        `Escala operacional — ${data}. (Imagem baixada — toque em 📎 e anexe a última foto/download)`,
      );
      window.open(`https://wa.me/${number}?text=${msg}`, "_blank");
      toast.success(`Chat com ${recipient} aberto — anexe a imagem baixada e envie`);
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

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={exportImage}
          disabled={exporting}
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-secondary py-3.5 text-xs font-semibold disabled:opacity-60"
        >
          <ImageDown className="size-4" />
          {exporting ? "Gerando..." : "Salvar imagem"}
        </button>
        <button
          type="button"
          onClick={() => shareWhatsApp(NATY_WHATSAPP_NUMBER, "Naty")}
          disabled={exporting}
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-primary py-3.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Send className="size-4" />
          {exporting ? "Gerando..." : "Enviar p/ Naty"}
        </button>
        <button
          type="button"
          onClick={() => shareWhatsApp(FOEGER_WHATSAPP_NUMBER, "Foeger")}
          disabled={exporting}
          className="flex flex-col items-center justify-center gap-1 rounded-xl bg-primary py-3.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Send className="size-4" />
          {exporting ? "Gerando..." : "Enviar p/ Foeger"}
        </button>
      </div>
    </div>
  );
}
