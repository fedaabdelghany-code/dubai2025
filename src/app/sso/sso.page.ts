import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sso',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './sso.page.html',
  styleUrls: ['./sso.page.scss'],
})
export class SsoPage {
  private router = inject(Router);
  private notify = inject(NotificationService);
  private authService = inject(AuthService);

  isLoading = false;
  loadingMessage = '';

  async signInWithGoogle() {
    this.isLoading = true;
    this.loadingMessage = 'Signing in...';
    try {
      const user = await this.authService.signInWithGoogle();
      if (user) {
        this.loadingMessage = `Welcome, ${user.displayName || 'User'}!`;
        await new Promise(res => setTimeout(res, 800)); // smooth transition
        await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
      }
    } catch (error: any) {
      console.error('[SSO] Sign-in error:', error);
      const message = this.formatError(error.code || error.message);
      this.notify.showToast(message, 'warning');
    } finally {
      this.isLoading = false;
    }
  }

  private formatError(message: string): string {
    if (!message) return 'Unknown error occurred.';
    if (message.includes('popup-closed-by-user')) return 'Sign-in cancelled. Please try again.';
    if (message.includes('auth/network-request-failed')) return 'Network error. Please check your connection.';
    if (message.includes('auth/unauthorized-domain')) return 'Unauthorized domain. Please contact support.';
    if (message.includes('auth/popup-blocked')) return 'Popup was blocked. Please enable popups and try again.';
    if (message.includes('auth/internal-error')) return 'Internal authentication error. Try again later.';
    return 'Sign-in failed. Please try again.';
  }
}
