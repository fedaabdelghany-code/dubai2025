import { Component, OnInit, inject, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PwaService } from './services/pwa.service';
import { AuthService } from './services/auth.service';
import { AgendaService } from './services/agenda.service';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

declare const OneSignal: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, CommonModule, RouterModule],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private authService = inject(AuthService);
  private pwaService = inject(PwaService);
  private platform = inject(Platform);
  private agendaService = inject(AgendaService);
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  isIos = false;
  showInstallBanner = false;
  deferredPrompt: any;

  
  async ngOnInit() {
    console.log('[APP] Initializing...');

    // ✅ Wait for Firebase Auth initialization before routing
    await this.authService.waitForAuthResolved();

    // ✅ Navigate to splash if at root
    if (this.router.url === '/' || this.router.url === '') {
      await this.router.navigateByUrl('/splash', { replaceUrl: true });
    }

    // ✅ Handle PWA install banners
    this.checkInstallSupport();
    this.handleBeforeInstallPrompt();

    // ✅ Generate the user's agenda once per login session
    this.authService.user$
      .pipe(filter((user) => !!user && !!user.email))
      .subscribe(async (user) => {
        console.log(`[APP] Authenticated user: ${user?.email}`);
        try {
          await this.agendaService.generateUserAgenda();
          console.log('[APP] ✅ Agenda generation completed');
        } catch (err) {
          console.error('[APP] ❌ Failed to generate agenda:', err);
        }
      });
  }

  /** ✅ Wait for OneSignal SDK and save Player ID */
  async ngAfterViewInit() {
    console.log('[OneSignal] Waiting for SDK to load...');

    // Wait until SDK is ready
    const checkSDK = () =>
      new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if ((window as any).OneSignal) {
            clearInterval(interval);
            resolve();
          }
        }, 300);
      });

    await checkSDK();

    const OneSignal = (window as any).OneSignal;
    if (!OneSignal) {
      console.warn('[OneSignal] SDK not found on window');
      return;
    }

    console.log('[OneSignal] SDK loaded, checking push support...');

    try {
      const isSupported = await OneSignal.Notifications.isPushSupported();
      if (!isSupported) {
        console.warn('[OneSignal] Push not supported on this device/browser');
        return;
      }

      // Request permission if needed
      const permission = await OneSignal.Notifications.permission;
      if (permission !== 'granted') {
        console.log('[OneSignal] Requesting permission for push...');
        await OneSignal.Notifications.requestPermission();
      }

      // ✅ Try multiple methods to get the Player ID
      let playerId: string | null = null;

      // Method 1: Try the User.PushSubscription API (v16+)
      try {
        if (OneSignal.User?.PushSubscription?.id) {
          playerId = OneSignal.User.PushSubscription.id;
          console.log('[OneSignal] ✅ Got Player ID via User.PushSubscription.id:', playerId);
        }
      } catch (e) {
        console.log('[OneSignal] User.PushSubscription.id not available');
      }

      // Method 2: Try getUserId() (older versions)
      if (!playerId) {
        try {
          playerId = await OneSignal.getUserId();
          console.log('[OneSignal] ✅ Got Player ID via getUserId():', playerId);
        } catch (e) {
          console.log('[OneSignal] getUserId() not available');
        }
      }

      // Method 3: Try getExternalUserId or other deprecated methods
      if (!playerId) {
        try {
          const subscriptionState = await OneSignal.getSubscription();
          playerId = subscriptionState?.userId;
          console.log('[OneSignal] ✅ Got Player ID via getSubscription():', playerId);
        } catch (e) {
          console.log('[OneSignal] getSubscription() not available');
        }
      }

      if (playerId) {
        console.log('[OneSignal] ✅ Final Player ID:', playerId);
        await this.linkPlayerIdToFirestore(playerId);
      } else {
        console.warn('[OneSignal] ⚠️ No player ID yet, listening for changes...');

        // Watch for subscription change event
        try {
          OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
            console.log('[OneSignal] Subscription changed:', event);
            const newId = event?.current?.id || event?.current?.userId;
            if (newId) {
              console.log('[OneSignal] 🆕 Player ID obtained:', newId);
              await this.linkPlayerIdToFirestore(newId);
            }
          });
        } catch (e) {
          // Try older event listener API
          try {
            OneSignal.on('subscriptionChange', async (isSubscribed: boolean) => {
              console.log('[OneSignal] Subscription change (old API):', isSubscribed);
              if (isSubscribed) {
                const newPlayerId = await OneSignal.getUserId();
                if (newPlayerId) {
                  console.log('[OneSignal] 🆕 Player ID obtained:', newPlayerId);
                  await this.linkPlayerIdToFirestore(newPlayerId);
                }
              }
            });
          } catch (err) {
            console.error('[OneSignal] Could not attach subscription listener:', err);
          }
        }
      }
    } catch (error) {
      console.error('[OneSignal] ❌ Error while syncing player ID:', error);
    }
  }

  /** ✅ Firestore link helper */
  private async linkPlayerIdToFirestore(playerId: string) {
    const currentUser = this.authService.currentUser;
    if (!currentUser?.email) {
      console.warn('[Firestore] No current user, skipping Player ID link');
      return;
    }

    console.log(`[Firestore] Linking Player ID for ${currentUser.email}`);

    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('email', '==', currentUser.email.toLowerCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn(`[Firestore] ⚠️ No Firestore user found for ${currentUser.email}`);
        return;
      }

      const userDoc = snapshot.docs[0];
      const userRef = doc(this.firestore, `users/${userDoc.id}`);
      await setDoc(userRef, { oneSignalPlayerId: playerId }, { merge: true });

      console.log(`✅ [Firestore] Player ID saved for ${currentUser.email} → ${playerId}`);
    } catch (error) {
      console.error('[Firestore] ❌ Error linking Player ID:', error);
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