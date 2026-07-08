import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, ChevronUp } from "lucide-react";

interface Escada {
  id: string;
  plataforma: string;
  nome: string;
  direcao: string;
  horario: string; // "HH:MM"
}

const ESCADAS_CONFIG: Escada[] = [
  { id: "e1", plataforma: "Plataforma 1", nome: "Escada 1", direcao: "descer", horario: "08:30" },
  { id: "e4", plataforma: "Plataforma 2", nome: "Escada 4", direcao: "descer", horario: "10:00" },
  { id: "e6", plataforma: "Plataforma 4", nome: "Escada 6", direcao: "subir",  horario: "09:00" },
  { id: "e7", plataforma: "Plataforma 6", nome: "Escada 7", direcao: "descer", horario: "09:00" },
];

function getMsUntil(horario: string): number {
  const now = new Date();
  const [h, m] = horario.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1); // next day
  }
  return target.getTime() - now.getTime();
}

function getTimeLeft(horario: string): string {
  const ms = getMsUntil(horario);
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function isWarning(horario: string): boolean {
  const ms = getMsUntil(horario);
  return ms <= 30 * 60 * 1000; // 30 min or less
}

export function EscadasNotif() {
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [popups, setPopups] = useState<{ id: string; msg: string }[]>([]);
  const swRef = useRef<ServiceWorker | null>(null);
  const scheduledRef = useRef<Set<string>>(new Set());

  // Clock tick every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Register service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw-escadas.js").then((reg) => {
      swRef.current = reg.active || reg.installing || reg.waiting;
      reg.addEventListener("updatefound", () => {
        swRef.current = reg.installing;
      });
    });
    setPerm(Notification.permission);
  }, []);

  // Schedule notifications when permission granted
  useEffect(() => {
    if (perm !== "granted") return;
    ESCADAS_CONFIG.forEach((e) => {
      if (scheduledRef.current.has(e.id)) return;
      const msUntil = getMsUntil(e.horario);
      if (msUntil > 24 * 60 * 60 * 1000) return; // skip if more than 24h
      scheduledRef.current.add(e.id);

      // Schedule in-app popups: 30, 20, 10 min before + on time
      const msg = `${e.plataforma} — ${e.nome} (${e.direcao}) às ${e.horario}`;
      [30, 20, 10].forEach((min) => {
        const delay = msUntil - min * 60 * 1000;
        if (delay > 0) {
          setTimeout(() => {
            setPopups((p) => [...p, { id: `${e.id}-${min}`, msg: `⚠️ Faltam ${min}min — ${msg}` }]);
            setTimeout(() => setPopups((p) => p.filter((x) => x.id !== `${e.id}-${min}`)), 60_000);
          }, delay);
        }
      });
      // On time popup
      setTimeout(() => {
        setPopups((p) => [...p, { id: `${e.id}-now`, msg: `🚨 AGORA — Alterar escada!\n${msg}` }]);
        setTimeout(() => setPopups((p) => p.filter((x) => x.id !== `${e.id}-now`)), 120_000);
      }, msUntil);

      // Send to SW for background notifications
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "SCHEDULE_ESCADA", escada: msg, horario: e.horario, msUntil });
      });
    });
  }, [perm]);

  const requestPerm = async () => {
    const result = await Notification.requestPermission();
    setPerm(result);
  };

  return (
    <>
      {/* Floating popups */}
      <div className="fixed left-0 right-0 top-16 z-[99] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {popups.map((p) => (
          <div
            key={p.id}
            className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-top-4 rounded-xl border border-amber-500/50 bg-amber-950/95 px-4 py-3 shadow-2xl backdrop-blur-sm"
          >
            <p className="whitespace-pre-line text-sm font-bold text-amber-200">{p.msg}</p>
          </div>
        ))}
      </div>

      {/* Bell button */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
        {/* Expanded panel */}
        {open && (
          <div className="mb-1 w-72 rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">🪜 Ordem das Escadas</p>
              {perm !== "granted" && (
                <button
                  onClick={requestPerm}
                  className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-bold text-white"
                >
                  Ativar alertas
                </button>
              )}
            </div>
            <div className="space-y-2">
              {ESCADAS_CONFIG.map((e) => {
                const warn = isWarning(e.horario);
                const left = getTimeLeft(e.horario);
                return (
                  <div
                    key={e.id}
                    className={`rounded-xl border px-3 py-2 ${warn ? "border-amber-500/60 bg-amber-950/40" : "border-border bg-card"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground">{e.plataforma}</p>
                        <p className={`text-sm font-bold ${warn ? "text-amber-300" : "text-foreground"}`}>
                          {e.nome} — {e.direcao}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-black ${warn ? "text-amber-400" : "text-primary"}`}>
                          {e.horario}
                        </p>
                        <p className={`text-[10px] ${warn ? "text-amber-500" : "text-muted-foreground"}`}>
                          em {left}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">
              {perm === "granted"
                ? "✅ Alertas ativos — 30, 20 e 10min antes"
                : "⚠️ Ative os alertas para notificações em segundo plano"}
            </p>
          </div>
        )}

        {/* Bell button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex size-12 items-center justify-center rounded-full shadow-lg transition-all ${
            perm === "granted"
              ? "bg-amber-600 text-white"
              : "bg-card border border-border text-muted-foreground"
          }`}
        >
          {perm === "granted" ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          {open ? (
            <ChevronDown className="absolute size-3 -bottom-0.5 -right-0.5" />
          ) : null}
        </button>
      </div>
    </>
  );
}
