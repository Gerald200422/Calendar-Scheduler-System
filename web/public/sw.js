self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'Event Reminder', body: 'You have an upcoming event!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Event Reminder', body: event.data.text() };
    }
  }
  
  const ringtone = data.data?.ringtone || 'samsung_ringtone.mp3';
  const duration = data.data?.duration || 30;
  const isAlarm = data.data?.isAlarm || false;

  const options = {
    body: data.body,
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: data.actions || [],
    tag: 'scheduler-alert',
    renotify: true
  };

  // Broadcast to all open tabs to play the sound locally (Laptops/PWAs)
  // We trigger the ringing if it's an alarm style OR if a ringtone is specified
  if (data.data?.ringtone) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'RING_ALARM',
          ringtone: data.data.ringtone,
          duration: duration,
          isAlarm: isAlarm,
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
      return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
