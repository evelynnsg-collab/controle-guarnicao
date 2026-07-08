// Service Worker - Controle de Guarnição - Alertas de Escadas
const CACHE = "guarnicao-sw-v2";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Store scheduled alarms
const alarms = [];

self.addEventListener("message", (event) => {
  const { type, escadas } = event.data || {};

  if (type === "SCHEDULE_ESCADAS") {
    // Clear previous alarms
    alarms.forEach((t) => clearTimeout(t));
    alarms.length = 0;

    const now = Date.now();

    escadas.forEach((e) => {
      const { id, plataforma, nome, direcao, horario, avisarDe } = e;
      const msg = `${plataforma} — ${nome} (${direcao}) às ${horario}`;

      // Calculate horario ms
      const [hh, mm] = horario.split(":").map(Number);
      const target = new Date();
      target.setHours(hh, mm, 0, 0);
      if (target.getTime() <= now) target.setDate(target.getDate() + 1);
      const horarioMs = target.getTime();

      // Calculate avisarDe ms
      const [ah, am] = avisarDe.split(":").map(Number);
      const avisarDeTarget = new Date();
      avisarDeTarget.setHours(ah, am, 0, 0);
      if (avisarDeTarget.getTime() <= now) avisarDeTarget.setTime(now + 1000);
      let avisoTime = avisarDeTarget.getTime();

      // Schedule alerts every 10 min from avisarDe to horario
      let idx = 0;
      while (avisoTime <= horarioMs) {
        const delay = avisoTime - now;
        const isNow = avisoTime >= horarioMs - 30000; // within 30s of horario
        const minLeft = Math.round((horarioMs - avisoTime) / 60000);
        const avisoMsg = isNow
          ? `🚨 AGORA — Alterar escada!\n${msg}`
          : `⚠️ Faltam ${minLeft}min — ${msg}`;
        const urgente = isNow;
        const tag = `escada-${id}-${idx}`;

        if (delay > 0) {
          const t = setTimeout(() => {
            self.registration.showNotification(
              urgente ? "🚨 ALTERAR ESCADA AGORA!" : `⚠️ Escada em ${minLeft}min`,
              {
                body: msg,
                icon: "/icons/app-icon.png",
                badge: "/icons/app-icon.png",
                tag,
                requireInteraction: urgente,
                silent: false,
                vibrate: urgente ? [500, 200, 500, 200, 500] : [200, 100, 200],
                data: { urgente, msg },
              }
            );
          }, delay);
          alarms.push(t);
        }
        avisoTime += 10 * 60 * 1000;
        idx++;
      }
    });

    // Confirm scheduling
    event.source?.postMessage({ type: "SCHEDULED_OK", count: alarms.length });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("/");
      }
    })
  );
});
