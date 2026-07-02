import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, FileText, Sparkles, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { LOCAL_OPTIONS } from "@/lib/cg-constants";
import { formalizarTexto } from "@/lib/cg-ai.functions";
import { store, useOcorrencias, useProfile } from "@/lib/cg-store";
import { savePhoto, getPhoto, blobToDataUrl } from "@/lib/cg-photos";
import type { Ocorrencia } from "@/lib/cg-types";
import { cn } from "@/lib/utils";

type AiField = "ocorrencia" | "encaminhamento" | "situacaoFinal";

const HISTORICO_WHATSAPP_NUMBER = "5511914324246"; // +55 11 91432-4246


type SubTab = "form" | "preview" | "history";

const emptyForm = (responsavel: string): Omit<Ocorrencia, "id" | "createdAt"> => ({
  data: new Date().toISOString().slice(0, 10),
  horaInicio: "",
  horaFim: "",
  local: LOCAL_OPTIONS[0],
  passNome: "",
  passCpf: "",
  passEndereco: "",
  passTelefone: "",
  ocorrencia: "",
  encaminhamento: "",
  situacaoFinal: "",
  testemunha: "",
  responsavel,
});

function buildText(o: Omit<Ocorrencia, "id" | "createdAt">) {
  return [
    `REGISTRO DE OCORRÊNCIA`,
    `Data: ${o.data}   Início: ${o.horaInicio || "-"}   Término: ${o.horaFim || "-"}`,
    `Local: ${o.local}`,
    ``,
    `Passageiro: ${o.passNome || "-"}`,
    `CPF: ${o.passCpf || "-"}   Telefone: ${o.passTelefone || "-"}`,
    `Endereço: ${o.passEndereco || "-"}`,
    ``,
    `Ocorrência: ${o.ocorrencia || "-"}`,
    `Encaminhamento: ${o.encaminhamento || "-"}`,
    `Situação final: ${o.situacaoFinal || "-"}`,
    ``,
    `Testemunha: ${o.testemunha || "-"}`,
    `Responsável: ${o.responsavel}`,
  ].join("\n");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition-colors focus:border-ring";

function HistoryPhotos({ ids }: { ids: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const loaded: string[] = [];
      for (const id of ids) {
        const blob = await getPhoto(id);
        if (blob) {
          const url = URL.createObjectURL(blob);
          created.push(url);
          loaded.push(url);
        }
      }
      if (!cancelled) setUrls(loaded);
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noopener noreferrer">
          <img src={u} alt="" className="size-14 rounded-lg border border-border object-cover" />
        </a>
      ))}
    </div>
  );
}

export function OcorrenciaTab() {
  const profile = useProfile();
  const history = useOcorrencias();
  const [sub, setSub] = useState<SubTab>("form");
  const [form, setForm] = useState(() => emptyForm(profile?.name ?? ""));

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const previewText = useMemo(() => buildText(form), [form]);

  // Photos attached to the report being filled in (stored in IndexedDB on selection).
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setPhotosBusy(true);
    try {
      const added: { id: string; url: string }[] = [];
      for (const file of files) {
        const id = await savePhoto(file);
        added.push({ id, url: URL.createObjectURL(file) });
      }
      setPhotos((prev) => [...prev, ...added]);
      toast.success(`${files.length} foto(s) anexada(s)`);
    } catch {
      toast.error("Não foi possível anexar as fotos");
    } finally {
      setPhotosBusy(false);
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  // AI: rewrite Ocorrência / Encaminhamento / Situação final to be more formal
  const runFormalize = useServerFn(formalizarTexto);
  const [aiBusy, setAiBusy] = useState<Record<AiField, boolean>>({
    ocorrencia: false,
    encaminhamento: false,
    situacaoFinal: false,
  });
  const timers = useRef<Record<AiField, ReturnType<typeof setTimeout> | null>>({
    ocorrencia: null,
    encaminhamento: null,
    situacaoFinal: null,
  });
  const lastAi = useRef<Record<AiField, string>>({
    ocorrencia: "",
    encaminhamento: "",
    situacaoFinal: "",
  });

  const setAi = (k: AiField, v: string) => {
    set(k, v);
    if (timers.current[k]) clearTimeout(timers.current[k]!);
    const value = v.trim();
    if (value.length < 8 || value === lastAi.current[k]) return;
    timers.current[k] = setTimeout(async () => {
      setAiBusy((b) => ({ ...b, [k]: true }));
      try {
        const { text } = await runFormalize({ data: { text: value, campo: k } });
        lastAi.current[k] = text;
        set(k, text);
      } catch {
        toast.error("Não foi possível formalizar o texto agora.");
      } finally {
        setAiBusy((b) => ({ ...b, [k]: false }));
      }
    }, 2000);
  };

  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach((id) => id && clearTimeout(id));
    };
  }, []);


  function save() {
    store.addOcorrencia({
      ...form,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      fotos: photos.map((p) => p.id),
    });
    setPhotos([]);
    toast.success("Ocorrência salva no histórico");
  }
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Texto copiado");
  }
  function whatsapp(text: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function loadImageSize(dataUrl: string): Promise<{ w: number; h: number }> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = dataUrl;
    });
  }

  async function buildPdfBlob() {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const marginTop = 22;
    const footerY = pageHeight - 12;
    const contentWidth = pageWidth - marginX * 2;
    const footerLimit = footerY - 8;

    for (let idx = 0; idx < history.length; idx++) {
      const o = history[idx];
      if (idx > 0) doc.addPage();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Registro de Ocorrência", marginX, marginTop);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Relatório ${idx + 1} de ${history.length}`, pageWidth - marginX, marginTop, { align: "right" });
      doc.setTextColor(0);

      doc.setDrawColor(200);
      doc.line(marginX, marginTop + 4, pageWidth - marginX, marginTop + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(buildText(o), contentWidth);
      doc.text(lines, marginX, marginTop + 14);

      // Attached photos, laid out in a 2-column grid below the text.
      const photoIds = o.fotos ?? [];
      if (photoIds.length > 0) {
        const textHeight = doc.getTextDimensions(lines).h;
        let y = marginTop + 14 + textHeight + 8;
        const gap = 4;
        const colWidth = (contentWidth - gap) / 2;
        const maxCellHeight = 70;
        let col = 0;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Fotos anexadas:", marginX, y);
        y += 6;

        for (const id of photoIds) {
          const blob = await getPhoto(id);
          if (!blob) continue;
          const dataUrl = await blobToDataUrl(blob);
          const size = await loadImageSize(dataUrl);
          const ratio = size.h / size.w;
          const cellH = Math.min(maxCellHeight, colWidth * ratio);

          if (y + cellH > footerLimit) {
            doc.addPage();
            y = marginTop;
            col = 0;
          }
          const x = marginX + col * (colWidth + gap);
          try {
            doc.addImage(dataUrl, "JPEG", x, y, colWidth, cellH, undefined, "FAST");
          } catch {
            /* skip photo that fails to embed */
          }
          if (col === 1) {
            y += cellH + gap;
            col = 0;
          } else {
            col = 1;
          }
        }
      }
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(220);
      doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(130);
      doc.text("Projeto criado e desenvolvido por Evelyn Santos - AAS", pageWidth / 2, footerY, { align: "center" });
      doc.setTextColor(0);
    }

    return doc.output("blob");
  }

  async function exportPdfWhatsApp() {
    if (history.length === 0) {
      toast.error("Nenhuma ocorrência no histórico.");
      return;
    }
    const fileName = `historico-ocorrencias-${new Date().toISOString().slice(0, 10)}.pdf`;
    const blob = await buildPdfBlob();
    const file = new File([blob], fileName, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Histórico de Ocorrências" });
        return;
      } catch {
        /* user cancelled or unsupported — fall back to download */
      }
    }
    // Fallback: download the PDF and open the specific WhatsApp chat to attach it.
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    const msg = encodeURIComponent(
      "Histórico de Ocorrências. (PDF baixado, anexe aqui na conversa)",
    );
    window.open(`https://wa.me/${HISTORICO_WHATSAPP_NUMBER}?text=${msg}`, "_blank");
    toast.success("PDF baixado — anexe na conversa do WhatsApp que abriu");
  }


  const subs: { key: SubTab; label: string }[] = [
    { key: "form", label: "Formulário" },
    { key: "preview", label: "Prévia" },
    { key: "history", label: "Histórico" },
  ];

  return (
    <div className="px-4 pb-6 pt-4">
      <div className="mb-4 flex rounded-xl bg-card p-1">
        {subs.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSub(s.key)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
              sub === s.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sub === "form" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data">
              <input type="date" className={inputCls} value={form.data} onChange={(e) => set("data", e.target.value)} />
            </Field>
            <Field label="Início">
              <input type="time" className={inputCls} value={form.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} />
            </Field>
            <Field label="Término">
              <input type="time" className={inputCls} value={form.horaFim} onChange={(e) => set("horaFim", e.target.value)} />
            </Field>
          </div>

          <Field label="Local">
            <select className={inputCls} value={form.local} onChange={(e) => set("local", e.target.value)}>
              {LOCAL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Passageiro
            </p>
            <div className="space-y-3">
              <input className={inputCls} placeholder="Nome" value={form.passNome} onChange={(e) => set("passNome", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className={inputCls} placeholder="CPF" value={form.passCpf} onChange={(e) => set("passCpf", e.target.value)} />
                <input className={inputCls} placeholder="Telefone" value={form.passTelefone} onChange={(e) => set("passTelefone", e.target.value)} />
              </div>
              <input className={inputCls} placeholder="Endereço" value={form.passEndereco} onChange={(e) => set("passEndereco", e.target.value)} />
            </div>
          </div>

          {(
            [
              { key: "ocorrencia" as const, label: "Ocorrência", min: "min-h-24" },
              { key: "encaminhamento" as const, label: "Encaminhamento", min: "min-h-20" },
              { key: "situacaoFinal" as const, label: "Situação final", min: "min-h-20" },
            ]
          ).map((f) => (
            <Field key={f.key} label={f.label}>
              <div className="relative">
                <textarea
                  className={cn(inputCls, f.min, "resize-y pr-9")}
                  value={form[f.key]}
                  onChange={(e) => setAi(f.key, e.target.value)}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute right-2 top-2 flex items-center gap-1 text-[10px] font-medium text-primary transition-opacity",
                    aiBusy[f.key] ? "opacity-100" : "opacity-0",
                  )}
                >
                  <Sparkles className="size-3.5 animate-pulse" />
                  IA
                </span>
              </div>
            </Field>
          ))}

          <Field label="Testemunha">
            <input className={inputCls} value={form.testemunha} onChange={(e) => set("testemunha", e.target.value)} />
          </Field>
          <Field label="Responsável">
            <input className={cn(inputCls, "opacity-70")} value={form.responsavel} readOnly />
          </Field>

          <div className="rounded-xl border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fotos {photos.length > 0 && `(${photos.length})`}
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onPickPhotos}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photosBusy}
                className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium disabled:opacity-60"
              >
                <Camera className="size-3.5" />
                {photosBusy ? "Anexando..." : "Adicionar fotos"}
              </button>
            </div>
            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                    <img src={p.url} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                      aria-label="Remover foto"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={save} className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground">
              Salvar
            </button>
            <button type="button" onClick={() => setSub("preview")} className="rounded-xl bg-secondary py-3 text-sm font-semibold">
              Ver prévia
            </button>
          </div>
        </div>
      )}

      {sub === "preview" && (
        <div className="space-y-4">
          <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm leading-relaxed">
            {previewText}
          </pre>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => copy(previewText)} className="rounded-xl bg-secondary py-3 text-sm font-semibold">
              Copiar
            </button>
            <button type="button" onClick={() => whatsapp(previewText)} className="rounded-xl bg-jade py-3 text-sm font-semibold text-jade-foreground">
              WhatsApp
            </button>
          </div>
        </div>
      )}

      {sub === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">
              Os registros são apagados automaticamente após 7 dias.
            </p>
            <button
              type="button"
              onClick={exportPdfWhatsApp}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-jade px-3 py-2 text-xs font-semibold text-jade-foreground"
            >
              <FileText className="size-4" />
              Enviar histórico (PDF)
            </button>
          </div>
          {history.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma ocorrência registrada.
            </p>
          )}

          {history.map((o) => (
            <div key={o.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{o.local}</p>
                <p className="text-xs text-muted-foreground">{o.data}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{o.ocorrencia || "—"}</p>
              <HistoryPhotos ids={o.fotos ?? []} />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => copy(buildText(o))} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium">
                  Copiar
                </button>
                <button type="button" onClick={() => whatsapp(buildText(o))} className="rounded-lg bg-jade/15 px-3 py-1.5 text-xs font-medium text-jade">
                  WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
