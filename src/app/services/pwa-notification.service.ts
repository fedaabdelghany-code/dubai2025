// src/app/services/notification.service.ts
// Service Worker integrated version - MOST OPTIMAL

import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

interface Session {
  id: string;
  title: string;
  startTime: any;
  endTime: any;
  location: string;
  day: string;
}

interface ScheduledNotification {
  id: string;
  sessionId: string;
  title: string;
  body: string;
  showTime: number;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly STORAGE_KEY = 'scheduled_notifications';
  private readonly NOTIFICATION_ADVANCE_MS = 5 * 60 * 1000;

  constructor(private firestore: Firestore) {
    this.setupMessageListener();
  }

  /**
   * Listen for messages from service worker
   */
  private setupMessageListener() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'GET_NOTIFICATIONS') {
        // Service worker is requesting notification data
        const stored = localStorage.getItem(this.STORAGE_KEY);
        const notifications = stored ? JSON.parse(stored) : [];
        
        event.ports[0].postMessage({ notifications });
      } 
      else if (event.data.type === 'UPDATE_NOTIFICATIONS') {
        // Service worker wants to update the notification list
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(event.data.notifications));
      }
      else if (event.data.type === 'NAVIGATE') {
        // Service worker wants to navigate (from notification click)
        window.location.href = event.data.url;
      }
    });
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[Notifications] Not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Check if notifications are enabled
   */
  isNotificationEnabled(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Schedule notifications - stores in localStorage, service worker handles showing
   */
  async scheduleSessionNotifications(sessions: Session[]) {
    if (!this.isNotificationEnabled()) {
      return;
    }

    const now = Date.now();
    const scheduledNotifications: ScheduledNotification[] = [];

    sessions.forEach(session => {
      const startTime = session.startTime.toDate().getTime();
      const notificationTime = startTime - this.NOTIFICATION_ADVANCE_MS;

      if (notificationTime > now) {
        const timeStr = new Date(startTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });

        scheduledNotifications.push({
          id: `notif_${session.id}`,
          sessionId: session.id,
          title: 'Session Starting Soon',
          body: `${session.title}\n📍 ${session.location}\n🕐 ${timeStr}`,
          showTime: notificationTime,
          url: `/tabs/agenda?sessionId=${session.id}`
        });
      }
    });

    // Store in localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scheduledNotifications));
    
    // Notify service worker that notifications have been updated
    this.notifyServiceWorker();

    console.log(`[Notifications] Scheduled ${scheduledNotifications.length} notifications`);
  }

  /**
   * Notify service worker to check notifications
   */
  private async notifyServiceWorker() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_NOTIFICATIONS'
      });
    }
  }

  /**
   * Clear all scheduled notifications
   */
  clearAllNotifications() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[Notifications] Cleared all');
  }

  /**
   * Test notification
   */
  async testNotification() {
    if (!this.isNotificationEnabled()) {
      const granted = await this.requestPermission();
      if (!granted) {
        alert('Please enable notifications in your settings');
        return;
      }
    }

    // Use service worker notification if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      registration.showNotification('Test Notification', {
        body: 'Notifications are working! You\'ll receive reminders 5 minutes before each session.',
        icon: '/assets/logo-192.png',
      });
    } else {
      // Fallback to regular notification
      new Notification('Test Notification', {
        body: 'Notifications are working! You\'ll receive reminders 5 minutes before each session.',
        icon: '/assets/logo-192.png',
      });
    }
  }

  /**
   * Get permission status
   */
  getPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Load and schedule from Firestore
   */
  loadAndScheduleAllSessions() {
    const sessionsRef = collection(this.firestore, 'sessions');
    collectionData(sessionsRef, { idField: 'id' }).subscribe((sessions: any[]) => {
      this.scheduleSessionNotifications(sessions);
    });
  }

  /**
   * Store preference
   */
  setNotificationPreference(enabled: boolean) {
    localStorage.setItem('notifications_enabled', enabled.toString());
    if (!enabled) {
      this.clearAllNotifications();
    }
  }

  /**
   * Get preference
   */
  getNotificationPreference(): boolean {
    return localStorage.getItem('notifications_enabled') === 'true';
  }

  /**
   * Get count of pending notifications
   */
  getPendingCount(): number {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return 0;
    
    try {
      const notifications: ScheduledNotification[] = JSON.parse(stored);
      const now = Date.now();
      return notifications.filter(n => n.showTime > now).length;
    } catch {
      return 0;
    }
  }
}