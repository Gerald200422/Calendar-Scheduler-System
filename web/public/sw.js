self.addEventListener('push', (event) => {
  let data = { title: 'Event Reminder', body: 'You have an upcoming event!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Event Reminder', body: event.data.text() };
    }
  }
  
  const ringtone = data.data?.ringtone || 'alert1.wav';
  let vibrationPattern = [200, 100, 200]; // Default

  if (ringtone === 'alert2.wav') {
    vibrationPattern = [100, 50, 100, 50, 100, 50, 100]; // Fast/Crystal
  } else if (ringtone === 'classic.wav') {
    vibrationPattern = [500, 110, 500, 110, 500]; // Long/Classical
  } else if (ringtone === 'modern.wav') {
    vibrationPattern = [100, 100, 100, 100, 100, 100, 500]; // Modern/Pulse
  }

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: vibrationPattern,
    tag: 'scheduler-notification',
    renotify: true,
    data: data.data || {}
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
