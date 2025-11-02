import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PwaService } from './services/pwa.service';
import { AuthService } from './services/auth.service';
import { IonApp, IonRouterOutlet } from "@ionic/angular/standalone";  
import { CommonModule } from '@angular/common';
import { NotificationService } from './services/pwa-notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule, RouterModule],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private pwaService = inject(PwaService);
  private notificationService = inject(NotificationService);

  isIos = false;
  showInstallBanner = false;
  deferredPrompt: any;

  async ngOnInit() {
    // ✅ Wait for Firebase Auth initialization before splash routing
    await this.authService.waitForAuthResolved();

    // ✅ Always start with splash (handles routing logic itself)
    if (this.router.url === '/' || this.router.url === '') {
      await this.router.navigateByUrl('/splash', { replaceUrl: true });
    }

    // ✅ PWA install banner logic
    this.checkInstallSupport();
    this.handleBeforeInstallPrompt();

    // ✅ Register service worker for notifications
    this.registerServiceWorker();

    // Initialize notifications if user has previously enabled them
    if (this.notificationService.getNotificationPreference()) {
      this.notificationService.loadAndScheduleAllSessions();
    }

    // Re-schedule notifications when app comes back into focus
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.notificationService.isNotificationEnabled()) {
        this.notificationService.loadAndScheduleAllSessions();
      }
    });
  }

  /** ✅ Register service worker for notifications */
  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Register the notification worker from assets with root scope
const registration = await navigator.serviceWorker.register(
  '/assets/notification-worker.js',
  { scope: '/assets/notifications/' } // <-- ✅ unique scope
);

        console.log('✅ Notification worker registered:', registration);

        // Wait for this specific worker to be ready
        await registration.update();
        
        // Wait for the notification worker to become active
        const worker = registration.installing || registration.waiting || registration.active;
        
        if (worker && worker.state !== 'activated') {
          console.log('⏳ Waiting for notification worker to activate...');
          await new Promise<void>((resolve) => {
            worker.addEventListener('statechange', () => {
              console.log('   Worker state:', worker.state);
              if (worker.state === 'activated') {
                resolve();
              }
            });
          });
        }

        console.log('✅ Notification worker ready');

        // Send message directly to the notification worker
        const notificationWorker = registration.active;
        if (notificationWorker) {
          console.log('📤 Sending SCHEDULE_NOTIFICATIONS to notification worker');
          notificationWorker.postMessage({
            type: 'SCHEDULE_NOTIFICATIONS'
          });
          console.log('✅ Message sent to notification worker');
        } else {
          console.warn('⚠️ Notification worker not active yet');
        }
      } catch (error) {
        console.error('❌ Notification worker registration failed:', error);
      }
    }
  }

  /** ✅ Detect iOS and standalone mode */
  checkInstallSupport() {
    const ua = window.navigator.userAgent.toLowerCase();
    this.isIos = /iphone|ipad|ipod/.test(ua);
    const isStandalone =
      (window.navigator as any).standalone ||
      window.matchMedia('(display-mode: standalone)').matches;

    const dismissed = localStorage.getItem('installBannerDismissed') === 'true';
    if (!isStandalone && !dismissed) {
      this.showInstallBanner = true;
    }
  }

  /** ✅ Handle Android install prompt */
  handleBeforeInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event: any) => {
      console.log('[PWA] beforeinstallprompt fired');
      event.preventDefault();
      this.deferredPrompt = event;
      this.showInstallBanner = true;
    });
  }

  /** ✅ Trigger PWA install prompt */
  installPwa() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.finally(() => {
        this.deferredPrompt = null;
        this.showInstallBanner = false;
      });
    }
  }

  /** ✅ Dismiss iOS banner */
  dismissIosBanner() {
    this.showInstallBanner = false;
    localStorage.setItem('installBannerDismissed', 'true');
  }
}