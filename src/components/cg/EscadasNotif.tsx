import { useEffect, useRef, useState } from "react";

// ─── Alarme sonoro via Web Audio API ────────────────────────────────────────
function playAlarm(urgente = false) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const tocar = (freq: number, inicio: number, duracao: number, volume = 0.4) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(volume, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao + 0.05);
    };

    if (urgente) {
      // Sirene urgente — 6 bipes rápidos e altos
      for (let i = 0; i < 6; i++) {
        tocar(1200, i * 0.18, 0.12, 0.6);
        tocar(800,  i * 0.18 + 0.09, 0.09, 0.5);
      }
    } else {
      // Alerta normal — 3 bipes
      tocar(880, 0.0,  0.15, 0.4);
      tocar(880, 0.25, 0.15, 0.4);
      tocar(880, 0.50, 0.15, 0.4);
    }
  } catch {}
}
import { Bell, BellOff, ChevronDown, ChevronUp } from "lucide-react";

interface Escada {
  id: string;
  plataforma: string;
  nome: string;
  direcao: string;
  horario: string;   // "HH:MM" - hora de alterar
  avisarDe: string;  // "HH:MM" - hora de começar os avisos (a cada 10min)
}

const ESCADAS_CONFIG: Escada[] = [
  { id: "e1", plataforma: "Plataforma 1", nome: "Escada 1", direcao: "descer", horario: "08:30", avisarDe: "08:00" },
  { id: "e4", plataforma: "Plataforma 2", nome: "Escada 4", direcao: "descer", horario: "10:00", avisarDe: "09:30" },
  { id: "e6", plataforma: "Plataforma 4", nome: "Escada 6", direcao: "subir",  horario: "09:00", avisarDe: "08:30" },
  { id: "e7", plataforma: "Plataforma 6", nome: "Escada 7", direcao: "descer", horario: "09:00", avisarDe: "08:30" },
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
  const [popups, setPopups] = useState<{ id: string; msg: string; urgente?: boolean }[]>([]);
  const swRef = useRef<ServiceWorker | null>(null);
  const scheduledRef = useRef<Set<string>>(new Set());

  // Clock tick every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Register SW + setup permissions + schedule all alerts
  useEffect(() => {
    const init = async () => {
      setPerm(Notification.permission);

      if (!("serviceWorker" in navigator)) return;

      // Register SW
      const reg = await navigator.serviceWorker.register("/sw-escadas.js", { updateViaCache: "none" });
      await navigator.serviceWorker.ready;

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener("message", (evt) => {
        if (evt.data?.type === "SCHEDULED_OK") {
          console.log("[Escadas] SW scheduled", evt.data.count, "alerts");
        }
      });

      // If permission already granted, schedule immediately
      if (Notification.permission === "granted") {
        scheduleAll(reg);
      }
    };
    init();
  }, []);

  const scheduleAll = (reg?: ServiceWorkerRegistration) => {
    // 1. Send to SW for background notifications (works even when app is closed)
    navigator.serviceWorker.ready.then((r) => {
      r.active?.postMessage({
        type: "SCHEDULE_ESCADAS",
        escadas: ESCADAS_CONFIG,
      });
    });

    // 2. Schedule in-app popups + sound (works when app is open)
    ESCADAS_CONFIG.forEach((e) => {
      if (scheduledRef.current.has(e.id)) return;
      scheduledRef.current.add(e.id);

      const msg = `${e.plataforma} — ${e.nome} (${e.direcao}) às ${e.horario}`;
      const now = Date.now();

      const [hh, mm] = e.horario.split(":").map(Number);
      const horarioTarget = new Date();
      horarioTarget.setHours(hh, mm, 0, 0);
      if (horarioTarget.getTime() <= now) horarioTarget.setDate(horarioTarget.getDate() + 1);
      const horarioMs = horarioTarget.getTime();

      const [ah, am] = e.avisarDe.split(":").map(Number);
      const avisarDeTarget = new Date();
      avisarDeTarget.setHours(ah, am, 0, 0);
      if (avisarDeTarget.getTime() <= now) avisarDeTarget.setTime(now + 500);
      let avisoTime = avisarDeTarget.getTime();
      let idx = 0;

      while (avisoTime <= horarioMs) {
        const delay = avisoTime - now;
        const isUrgente = avisoTime >= horarioMs - 30_000;
        const minLeft = Math.round((horarioMs - avisoTime) / 60000);
        const avisoId = `${e.id}-${idx}`;

        if (delay >= 0) {
          setTimeout(() => {
            playAlarm(isUrgente);
            if (isUrgente) setTimeout(() => playAlarm(true), 3000);
            const avisoMsg = isUrgente
              ? `🚨 AGORA — Alterar escada!\n${msg}`
              : `⚠️ Faltam ${minLeft}min — ${msg}`;
            setPopups((p) => [...p, { id: avisoId, msg: avisoMsg, urgente: isUrgente }]);
            setTimeout(() => setPopups((p) => p.filter((x) => x.id !== avisoId)), isUrgente ? 120_000 : 90_000);
          }, delay);
        }
        avisoTime += 10 * 60 * 1000;
        idx++;
      }
    });
  };

  // When user grants permission, schedule
  useEffect(() => {
    if (perm === "granted") scheduleAll();
  }, [perm]);

  const requestPerm = async () => {
    const result = await Notification.requestPermission();
    setPerm(result);
    if (result === "granted") {
      scheduledRef.current.clear(); // reset so scheduleAll re-registers
      scheduleAll();
    }
  };

  return (
    <>
      {/* Floating popups */}
      <div className="fixed left-0 right-0 top-16 z-[99] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {popups.map((p) => (
          <div
            key={p.id}
            className={`pointer-events-auto w-full max-w-sm animate-in slide-in-from-top-4 rounded-xl border shadow-2xl backdrop-blur-sm ${
              p.urgente
                ? "border-red-500/70 bg-red-950/95"
                : "border-amber-500/50 bg-amber-950/95"
            }`}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="flex-1">
                <p className={`whitespace-pre-line text-sm font-bold ${p.urgente ? "text-red-200" : "text-amber-200"}`}>
                  {p.msg}
                </p>
              </div>
              <button
                onClick={() => {
                  setPopups((prev) => prev.filter((x) => x.id !== p.id));
                }}
                className={`mt-0.5 flex size-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  p.urgente ? "bg-red-800 text-red-200" : "bg-amber-800 text-amber-200"
                }`}
              >
                ✕
              </button>
            </div>
            {p.urgente && (
              <div className="flex items-center gap-2 border-t border-red-800/50 px-4 py-2">
                <span className="animate-pulse text-lg">🚨</span>
                <span className="text-xs font-bold text-red-300">Toque para dispensar</span>
                <button
                  onClick={() => {
                    playAlarm(true);
                  }}
                  className="ml-auto rounded-lg bg-red-800 px-2 py-1 text-xs font-bold text-red-200"
                >
                  🔊 Repetir
                </button>
              </div>
            )}
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
