self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nouvelle offre disponible',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || 'https://jobassistant.monairbyte.eu' },
    actions: [
      { action: 'voir', title: 'Voir l\'offre' },
      { action: 'ignorer', title: 'Ignorer' }
    ]
  };
  event.waitUntil(self.registration.showNotification(data.title || 'JobAssistant IA', options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if(event.action === 'voir' || !event.action) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
