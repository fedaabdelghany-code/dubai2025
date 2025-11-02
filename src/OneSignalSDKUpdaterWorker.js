importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");


// ✅ Safe custom listener: receive messages from your app (optional)
self.addEventListener('message', function (event) {
  console.log('[Custom SW] Message received:', event.data);
});

// ✅ Safe custom listener: log notification close events (optional)
self.addEventListener('notificationclose', function (event) {
  console.log('[Custom SW] Notification closed:', event.notification);

  // Optional: perform cleanup or analytics here without touching OneSignal internals
});
