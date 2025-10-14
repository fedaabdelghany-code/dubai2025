// notification.service.ts
import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private loading: HTMLIonLoadingElement | null = null;

  constructor(
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  async showLoading() {
    this.loading = await this.loadingCtrl.create({
      spinner: 'dots',
      cssClass: 'spinner-only',  // ✅ this line applies your custom SCSS
      message: '',               // ✅ ensures no text is shown
      backdropDismiss: false
    });
    await this.loading.present();
  }

  async hideLoading() {
    if (this.loading) {
      await this.loading.dismiss();
      this.loading = null;
    }
  }

  async showToast(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      cssClass: `toast-${type}`
    });
    await toast.present();
  }
}
