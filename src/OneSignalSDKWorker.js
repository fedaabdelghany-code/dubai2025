importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');

self.addEventListener('message', function (event) {
  console.log('[Custom SW] Message received:', event.data);
});

self.addEventListener('notificationclose', function (event) {
  console.log('[Custom SW] Notification closed:', event.notification);
});

// Single push event listener - this replaces both of your previous ones
self.addEventListener('push', function(event) {
  console.log('[Custom SW] Push event received:', event);
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[Custom SW] Notification payload:', payload);
      
      // Parse OneSignal notification data
      const title = payload.title || "Default title";
      const body = payload.alert || payload.body || "boop";
      
      const options = {
        body: body,
        icon: payload.icon || payload.large_icon || "https://via.placeholder.com/128",
        badge: payload.badge,
        image: payload.big_picture,
        data: payload.data || payload.custom || {},
        tag: payload.tag,
        requireInteraction: payload.require_interaction || false,
        actions: payload.actions || []
      };
      
      console.log('[Custom SW] Showing notification with:', { title, options });
      
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (error) {
      console.error('[Custom SW] Error parsing notification data:', error);
      
      // Fallback notification
      event.waitUntil(
        self.registration.showNotification("Notification", {
          body: "You have a new message",
          icon: "https://via.placeholder.com/128"
        })
      );
    }
  } else {
    console.log('[Custom SW] Push event has no data');
  }
});

