import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private deferredPrompt: any;
  public installPromptShown = false;

  constructor(private platform: Platform) {
    this.initPwaPrompt();
  }

  private initPwaPrompt() {
    if (this.platform.is('desktop') || this.platform.is('mobileweb')) {
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        this.deferredPrompt = e;
      });
    }
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    this.deferredPrompt = null;
    return outcome === 'accepted';
  }

  public canInstall(): boolean {
    return !!this.deferredPrompt;
  }
}