import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { getApp } from '@angular/fire/app';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service'; // ✅ Import the service

@Component({
  selector: 'app-sso',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './sso.page.html',
  styleUrls: ['./sso.page.scss'],
})
export class SsoPage {
  email = '';
  password = '';

  private auth = inject(Auth);
  private router = inject(Router);
  private notify = inject(NotificationService); // ✅ Inject here

  constructor() {
    const app = getApp();
    console.log('Firebase app name:', app.name);
  }

  async login() {
    if (!this.email || !this.password) {
      return this.notify.showToast(
        'Please enter both email and password.',
        'warning'
      );
    }

    await this.notify.showLoading();

    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
      await this.notify.hideLoading();
      this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    } catch (err: any) {
      await this.notify.hideLoading();
      this.notify.showToast(this.formatError(err.message), 'error');
    }
  }

  private formatError(message: string): string {
    if (message.includes('auth/invalid-credential'))
      return 'Invalid email or password.';
    if (message.includes('auth/too-many-requests'))
      return 'Too many attempts. Please try again later.';
    return 'Login failed. Please try again.';
  }
}
