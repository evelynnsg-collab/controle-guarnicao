import { Coffee, LogIn, LogOut, MapPin, UtensilsCrossed } from "lucide-react";
import { LOCATION_LABELS, STATIONS } from "@/lib/cg-constants";
import { store, useAgents, useProfile } from "@/lib/cg-store";
import type { Agent } from "@/lib/cg-types";
import { cn } from "@/lib/utils";
import { TrainSvg } from "./TrainSvg";

interface AccentStyle {
  text: string;
  tile: string;
  strip: string;
  activeBorder: string;
  activeBg: string;
  activeGlow: string;
  badge: string;
}

const ACCENT: Record<string, AccentStyle> = {
  coral: {
    text: "text-coral",
    tile: "bg-coral/15",
    strip: "bg-coral",
    activeBorder: "border-coral/80",
    activeBg: "bg-gradient-to-br from-coral/15 to-transparent",
    activeGlow: "shadow-[0_10px_30px_-12px_var(--color-coral)]",
    badge: "bg-coral/20 text-coral",
  },
  safira: {
    text: "text-safira",
    tile: "bg-safira/15",
    strip: "bg-safira",
    activeBorder: "border-safira/80",
    activeBg: "bg-gradient-to-br from-safira/15 to-transparent",
    activeGlow: "shadow-[0_10px_30px_-12px_var(--color-safira)]",
    badge: "bg-safira/20 text-safira",
  },
  jade: {
    text: "text-jade",
    tile: "bg-jade/15",
    strip: "bg-jade",
    activeBorder: "border-jade/80",
    activeBg: "bg-gradient-to-br from-jade/15 to-transparent",
    activeGlow: "shadow-[0_10px_30px_-12px_var(--color-jade)]",
    badge: "bg-jade/20 text-jade",
  },
  steel: {
    text: "text-foreground/70",
    tile: "bg-foreground/10",
    strip: "bg-foreground/50",
    activeBorder: "border-foreground/60",
    activeBg: "bg-gradient-to-br from-foreground/10 to-transparent",
    activeGlow: "shadow-[0_10px_30px_-14px_rgba(255,255,255,0.5)]",
    badge: "bg-foreground/15 text-foreground",
  },
};

function coverage(count: number) {
  if (count === 0) return { label: "Sem cobertura", dot: "bg-status-bad", text: "text-status-bad" };
  if (count === 1) return { label: "Efetivo reduzido", dot: "bg-status-warn", text: "text-status-warn" };
  return { label: "Coberta", dot: "bg-status-ok", text: "text-status-ok" };
}

function Stat({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3">
      <span className={cn("text-2xl font-bold tabular-nums", tone)}>{value}</span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}


/** Railway track decoration: two rails with sleepers. */
function RailTrack() {
  return (
    <div className="relative my-3 h-3 w-full overflow-hidden">
      <div
        className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 opacity-60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, var(--color-muted-foreground) 0 2px, transparent 2px 14px)",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[2px] rounded bg-muted-foreground/70" />
      <div className="absolute inset-x-0 bottom-0 h-[2px] rounded bg-muted-foreground/70" />
    </div>
  );
}

export function GuarnicaoTab() {
  const profile = useProfile();
  const agents = useAgents();
  if (!profile) return null;

  const self = agents.find((a) => a.id === profile.id);
  const total = agents.length;
  const noPosto = agents.filter((a) => a.onPost).length;
  const fora = total - noPosto;

  const at = (key: string) => agents.filter((a) => a.location === key);
  const almocoAgents = agents.filter((a) => a.interval === "almoco");
  const cafeAgents = agents.filter((a) => a.interval === "cafe");

  const setLocation = (key: Agent["location"]) => store.updateSelf({ location: key });
  const setInterval = (kind: Agent["interval"]) =>
    store.updateSelf({ interval: self?.interval === kind ? "none" : kind });

  return (
    <div className="space-y-3 px-4 pb-5 pt-3">
      {/* header stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat value={total} label="Agentes" />
        <Stat value={noPosto} label="No posto" tone="text-status-ok" />
        <Stat value={fora} label="Fora" tone="text-status-bad" />
      </div>


      {/* personal situation */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{profile.name}</p>
            <p className="text-sm text-muted-foreground">
              <MapPin className="mr-1 inline size-3.5" />
              {self?.location ? LOCATION_LABELS[self.location] : "Sem local definido"}
              {self?.interval !== "none" && self?.interval && (
                <span className="ml-2 rounded-md bg-status-warn/15 px-1.5 py-0.5 text-xs font-medium text-status-warn">
                  {self.interval === "almoco" ? "Em almoço" : "Em café"}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => store.updateSelf({ onPost: !self?.onPost })}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
              self?.onPost
                ? "bg-status-bad/15 text-status-bad"
                : "bg-status-ok/15 text-status-ok",
            )}
          >
            {self?.onPost ? <LogOut className="size-4" /> : <LogIn className="size-4" />}
            {self?.onPost ? "Sair" : "Entrar"}
          </button>
        </div>
      </div>

      {/* railway panel — compact station buttons (same style as cadastro) */}
      <div>
        <p className="mb-1 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Postos da guarnição
        </p>
        <RailTrack />
        <div className="grid grid-cols-2 gap-2.5">
          {STATIONS.map((s) => {
            const here = at(s.key);
            const cov = coverage(here.length);
            const active = self?.location === s.key;
            const ac = ACCENT[s.accent];
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setLocation(s.key)}
                className={cn(
                  "group relative flex flex-col gap-2 overflow-hidden rounded-2xl border bg-card px-3 py-2.5 text-left transition-all active:scale-[0.98]",
                  active
                    ? cn(ac.activeBorder, ac.activeBg, ac.activeGlow)
                    : "border-border hover:border-muted-foreground/30",
                )}
              >
                {/* accent strip */}
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 w-1 transition-opacity",
                    ac.strip,
                    active ? "opacity-100" : "opacity-40 group-hover:opacity-70",
                  )}
                />
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-xl",
                      ac.tile,
                    )}
                  >
                    <TrainSvg className={cn("size-6", ac.text)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold leading-tight">{s.label}</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <span className={cn("size-1.5 rounded-full", cov.dot)} />
                      <span className={cn("truncate text-[11px] font-medium", cov.text)}>
                        {cov.label}
                      </span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg text-sm font-bold tabular-nums",
                      here.length ? ac.badge : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {here.length}
                  </span>
                </div>
                <p className="line-clamp-2 pl-0.5 text-[11px] leading-snug text-muted-foreground">
                  {here.length
                    ? here.map((a) => a.name.split(" ")[0]).join(", ")
                    : "Ninguém aqui"}
                </p>
              </button>
            );
          })}
        </div>


        <RailTrack />
      </div>

      {/* intervals — signal only, no countdown */}
      <div>
        <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Intervalo
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div
            className={cn(
              "rounded-2xl border bg-card p-2.5 transition-all",
              self?.interval === "almoco"
                ? "border-status-warn/60 bg-gradient-to-br from-status-warn/12 to-transparent shadow-[0_10px_30px_-14px_var(--color-status-warn)]"
                : "border-border",
            )}
          >
            <button
              type="button"
              onClick={() => setInterval("almoco")}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-bold transition-colors active:scale-[0.98]",
                self?.interval === "almoco" ? "text-status-warn" : "text-foreground",
              )}
            >
              <UtensilsCrossed className="size-4" />
              Almoço (1h)
            </button>
            <p className="mt-1 line-clamp-2 px-1 text-center text-[11px] leading-snug text-muted-foreground">
              {almocoAgents.length
                ? almocoAgents.map((a) => a.name.split(" ")[0]).join(", ")
                : "Ninguém em almoço"}
            </p>
          </div>
          <div
            className={cn(
              "rounded-2xl border bg-card p-2.5 transition-all",
              self?.interval === "cafe"
                ? "border-status-warn/60 bg-gradient-to-br from-status-warn/12 to-transparent shadow-[0_10px_30px_-14px_var(--color-status-warn)]"
                : "border-border",
            )}
          >
            <button
              type="button"
              onClick={() => setInterval("cafe")}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg py-1.5 text-sm font-bold transition-colors active:scale-[0.98]",
                self?.interval === "cafe" ? "text-status-warn" : "text-foreground",
              )}
            >
              <Coffee className="size-4" />
              Café (30min)
            </button>
            <p className="mt-1 line-clamp-2 px-1 text-center text-[11px] leading-snug text-muted-foreground">
              {cafeAgents.length
                ? cafeAgents.map((a) => a.name.split(" ")[0]).join(", ")
                : "Ninguém em café"}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
