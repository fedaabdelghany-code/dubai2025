// src/app/services/pwa.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private deferredPrompt: any = null;
  private isIos = false;
  private isInStandaloneMode = false;

  constructor() {
    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    this.isIos = /iphone|ipad|ipod/.test(userAgent);

    // Detect if already installed
    this.isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;

    // Capture install event for Android/Chrome
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      console.log('beforeinstallprompt captured');
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.deferredPrompt = null;
    });
  }

  canInstall(): boolean {
    // Android case
    if (this.deferredPrompt) return true;

    // iOS case: show instruction if not standalone
    if (this.isIos && !this.isInStandaloneMode) return true;

    return false;
  }

  isIosDevice(): boolean {
    return this.isIos;
  }

  async promptInstall(): Promise<void> {
    // Android install
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      this.deferredPrompt = null;
    } else {
      console.log('No install prompt available');
    }
  }
}
