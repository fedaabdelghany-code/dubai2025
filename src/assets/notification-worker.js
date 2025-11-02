// notification-worker.js
// Custom worker that runs alongside Angular's service worker
// Place in: src/assets/notification-worker.js

const STORAGE_KEY = 'scheduled_notifications';
const CHECK_INTERVAL = 30000; // Check every 30 seconds

let checkInterval = null;

console.log('[NotificationWorker] Worker loaded');

/**
 * Start checking for notifications to show
 */
function startNotificationChecker() {
  if (checkInterval) {
    console.log('[NotificationWorker] Checker already running');
    return;
  }
  
  console.log('[NotificationWorker] ✅ Starting notification checker (every 30s)');
  
  checkInterval = setInterval(async () => {
    await checkAndShowNotifications();
  }, CHECK_INTERVAL);
  
  // Also check immediately
  console.log('[NotificationWorker] Running initial check...');
  checkAndShowNotifications();
}

/**
 * Get notifications from localStorage via main thread
 */
async function getStoredNotifications() {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    if (clients.length === 0) {
      console.log('[NotificationWorker] No clients found');
      return [];
    }

    // Create a message channel to get response
    const messageChannel = new MessageChannel();
    
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for notification data'));
      }, 5000);

      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      };
      
      clients[0].postMessage(
        { type: 'GET_NOTIFICATIONS' },
        [messageChannel.port2]
      );
    });
    
    return response.notifications || [];
  } catch (error) {
    console.error('[NotificationWorker] Error getting notifications:', error);
    return [];
  }
}

/**
 * Update notifications in localStorage via main thread
 */
async function updateStoredNotifications(notifications) {
  try {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'UPDATE_NOTIFICATIONS',
        notifications: notifications
      });
    }
  } catch (error) {
    console.error('[NotificationWorker] Error updating notifications:', error);
  }
}

/**
 * Check localStorage and show due notifications
 */
async function checkAndShowNotifications() {
  try {
    const notifications = await getStoredNotifications();
    
    if (!notifications || notifications.length === 0) {
      return;
    }

    const now = Date.now();
    const toShow = [];
    const remaining = [];
    
    // Separate notifications to show vs keep
    notifications.forEach(notif => {
      const timeDiff = now - notif.showTime;
      
      if (timeDiff >= 0 && timeDiff < 60000) {
        // Show if due (and not more than 1 min past due)
        toShow.push(notif);
      } else if (notif.showTime > now) {
        // Keep if still in future
        remaining.push(notif);
      }
      // Drop if too old (more than 1 min past due)
    });
    
    console.log(`[NotificationWorker] Check complete: ${toShow.length} to show, ${remaining.length} remaining`);
    
    // Show notifications
    for (const notif of toShow) {
      try {
        await self.registration.showNotification(notif.title, {
          body: notif.body,
          icon: '/assets/logo-192.png',
          badge: '/assets/logo-192.png',
          tag: notif.id,
          requireInteraction: false,
          vibrate: [200, 100, 200],
          data: {
            url: notif.url,
            sessionId: notif.sessionId
          }
        });
        
        console.log('[NotificationWorker] ✅ Showed notification:', notif.title);
      } catch (error) {
        console.error('[NotificationWorker] Error showing notification:', error);
      }
    }
    
    // Update stored notifications (remove shown ones)
    if (toShow.length > 0) {
      await updateStoredNotifications(remaining);
    }
    
  } catch (error) {
    console.error('[NotificationWorker] Error in check cycle:', error);
  }
}

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[NotificationWorker] Notification clicked:', event.notification.tag);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/tabs/agenda';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            // Navigate the existing client
            client.postMessage({
              type: 'NAVIGATE',
              url: urlToOpen
            });
            return client.focus();
          }
        }
        
        // Open new window if app not open
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

/**
 * Handle messages from the app
 */
self.addEventListener('message', (event) => {
  console.log('[NotificationWorker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    console.log('[NotificationWorker] Received schedule command');
    startNotificationChecker();
  } else if (event.data && event.data.type === 'PING') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ status: 'alive' });
    }
  } else {
    console.log('[NotificationWorker] Unknown message type or no data');
  }
});

/**
 * Start checker when service worker activates
 */
self.addEventListener('activate', (event) => {
  console.log('[NotificationWorker] Activated');
  event.waitUntil(self.clients.claim().then(() => {
    startNotificationChecker();
  }));
});

/**
 * Install event
 */
self.addEventListener('install', (event) => {
  console.log('[NotificationWorker] Installed');
  self.skipWaiting();
});