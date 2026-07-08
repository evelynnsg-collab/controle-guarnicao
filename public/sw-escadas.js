// Service Worker para notificações de horários das escadas
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_ESCADA') {
    const { escada, horario, msUntil } = event.data;
    // Agenda notificações: 30min, 20min, 10min antes
    const intervals = [30 * 60 * 1000, 20 * 60 * 1000, 10 * 60 * 1000];
    intervals.forEach((interval) => {
      const delay = msUntil - interval;
      if (delay > 0) {
        setTimeout(() => {
          const minutos = Math.round(interval / 60000);
          self.registration.showNotification(`⚠️ Escada em ${minutos} minutos`, {
            body: escada,
            icon: '/icons/app-icon.png',
            badge: '/icons/app-icon.png',
            tag: `escada-${escada}-${minutos}`,
            requireInteraction: true,
            vibrate: [200, 100, 200],
          });
        }, Math.max(delay, 0));
      }
    });
    // Notificação na hora exata
    setTimeout(() => {
      self.registration.showNotification(`🚨 AGORA — Alterar escada!`, {
        body: escada,
        icon: '/icons/app-icon.png',
        badge: '/icons/app-icon.png',
        tag: `escada-${escada}-now`,
        requireInteraction: true,
        vibrate: [500, 200, 500, 200, 500],
      });
    }, Math.max(msUntil, 0));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});
