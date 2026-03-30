self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'New Notification', body: 'You have a new message!' };
  
  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: data.data || {},
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open Scheduler' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
