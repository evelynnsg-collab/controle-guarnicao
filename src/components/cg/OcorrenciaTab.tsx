import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LOCAL_OPTIONS } from "@/lib/cg-constants";
import { formalizarTexto } from "@/lib/cg-ai.functions";
import { store, useOcorrencias, useProfile } from "@/lib/cg-store";
import type { Ocorrencia } from "@/lib/cg-types";
import { cn } from "@/lib/utils";

type AiField = "ocorrencia" | "encaminhamento" | "situacaoFinal";


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

export function OcorrenciaTab() {
  const profile = useProfile();
  const history = useOcorrencias();
  const [sub, setSub] = useState<SubTab>("form");
  const [form, setForm] = useState(() => emptyForm(profile?.name ?? ""));

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const previewText = useMemo(() => buildText(form), [form]);

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
    store.addOcorrencia({ ...form, id: crypto.randomUUID(), createdAt: Date.now() });
    toast.success("Ocorrência salva no histórico");
  }
  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Texto copiado");
  }
  function whatsapp(text: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function buildWordBlob() {
    const body = history
      .map(
        (o) =>
          `<div style="margin-bottom:24px;white-space:pre-wrap;font-family:Arial,sans-serif;font-size:11pt">${buildText(o)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")}</div>`,
      )
      .join('<hr style="border:none;border-top:1px solid #ccc;margin:16px 0"/>');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Histórico de Ocorrências</title></head><body><h2 style="font-family:Arial,sans-serif">Histórico de Ocorrências</h2>${body}</body></html>`;
    return new Blob(["\ufeff", html], { type: "application/msword" });
  }

  async function exportWordWhatsApp() {
    if (history.length === 0) {
      toast.error("Nenhuma ocorrência no histórico.");
      return;
    }
    const fileName = `historico-ocorrencias-${new Date().toISOString().slice(0, 10)}.doc`;
    const blob = buildWordBlob();
    const file = new File([blob], fileName, { type: "application/msword" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Histórico de Ocorrências" });
        return;
      } catch {
        /* user cancelled or unsupported — fall back to download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Documento Word baixado. Anexe-o no WhatsApp.");
    window.open("https://wa.me/", "_blank");
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
              onClick={exportWordWhatsApp}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-jade px-3 py-2 text-xs font-semibold text-jade-foreground"
            >
              <FileText className="size-4" />
              Word + WhatsApp
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
