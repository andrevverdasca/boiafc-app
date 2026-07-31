self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Boia FC', body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Boia FC', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' }
  }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});
