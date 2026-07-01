import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { STATIONS } from "@/lib/cg-constants";
import { store } from "@/lib/cg-store";
import { cn } from "@/lib/utils";
import { TrainSvg } from "./TrainSvg";

const accentText: Record<string, string> = {
  coral: "text-coral",
  safira: "text-safira",
  jade: "text-jade",
  steel: "text-muted-foreground",
};
const accentRing: Record<string, string> = {
  coral: "border-coral text-coral",
  safira: "border-safira text-safira",
  jade: "border-jade text-jade",
  steel: "border-foreground/60 text-foreground",
};

export function Cadastro() {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<(typeof STATIONS)[number]["key"] | null>(null);

  const canSave = name.trim().length >= 3 && platform !== null;

  function handleSave() {
    if (!canSave) return;
    store.setProfile({
      id: crypto.randomUUID(),
      name: name.trim(),
      platform: platform!,
    });
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Controle de Guarnição</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Linhas 11-Coral · 12-Safira · 13-Jade
          </p>
        </div>

        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Nome completo
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite seu nome"
          className="mb-6 w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none transition-colors focus:border-ring"
        />

        <label className="mb-2 block text-sm font-medium text-muted-foreground">
          Seu posto
        </label>
        <div className="grid grid-cols-2 gap-3">
          {STATIONS.map((s) => {
            const active = platform === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setPlatform(s.key)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 bg-card px-3 py-3 text-left transition-all",
                  active
                    ? accentRing[s.accent]
                    : "border-border text-foreground hover:border-muted-foreground/40",
                )}
              >
                <TrainSvg className={cn("size-8 shrink-0", accentText[s.accent])} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold leading-tight">{s.label}</span>
                  {s.line && (
                    <span className="text-xs text-muted-foreground">{s.line}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="mt-8 w-full rounded-xl bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          Entrar no painel
        </button>
      </div>
    </div>
  );
}
