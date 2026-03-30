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
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    vibrate: vibrationPattern,
    data: data.data,
    actions: data.actions || [],
    tag: 'scheduler-alert',
    renotify: true
  };

  // Broadcast to all open tabs to play the sound locally (Laptops/PWAs)
  if (data.data?.ringtone) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'RING_ALARM',
          ringtone: data.data.ringtone,
          title: data.title
        });
      });
    });
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'stop') {
    // Already closed, just exit
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(event.notification.data.url || 'https://calendarschedulersystem.vercel.app/');
    })
  );
});
