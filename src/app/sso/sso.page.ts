import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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
export class SsoPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private notify = inject(NotificationService);
  private authService = inject(AuthService);

  isLoading = false;
  loadingMessage = '';
  private signInTimeout?: number;
  private readonly TIMEOUT_MS = 30000;

  async ngOnInit() {
    // Wait for Firebase auth to initialize
    await this.authService.waitForAuthResolved();

    // If already logged in, skip SSO
    const user = this.authService.currentUser;
    if (user) {
      await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    }
  }

  ngOnDestroy() {
    this.clearSignInTimeout();
  }

  async signInWithGoogle() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loadingMessage = 'Signing in...';

    this.signInTimeout = window.setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.notify.showToast('Sign-in timed out. Please try again.', 'warning');
      }
    }, this.TIMEOUT_MS);

    try {
      const user = await this.authService.signInWithGoogle();
      this.clearSignInTimeout();

      if (user) {
        this.loadingMessage = `Welcome, ${user.displayName || 'User'}!`;
        await new Promise(res => setTimeout(res, 800));
        await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
      } else {
        throw new Error('No user returned from authentication');
      }
    } catch (error: any) {
      console.error('[SSO] Sign-in error:', error);
      this.clearSignInTimeout();

      const message = this.formatError(error.code || error.message);
      this.notify.showToast(message, 'warning');
    } finally {
      this.isLoading = false;
      this.loadingMessage = '';
    }
  }

  private clearSignInTimeout() {
    if (this.signInTimeout) {
      clearTimeout(this.signInTimeout);
      this.signInTimeout = undefined;
    }
  }

  private formatError(message: string): string {
    if (!message) return 'Unknown error occurred.';
    if (message.includes('popup-closed-by-user')) return 'Sign-in cancelled. Please try again.';
    if (message.includes('auth/network-request-failed')) return 'Network error. Please check your connection.';
    if (message.includes('auth/unauthorized-domain')) return 'Unauthorized domain. Please contact support.';
    if (message.includes('auth/popup-blocked')) return 'Popup was blocked. Please enable popups and try again.';
    if (message.includes('auth/internal-error')) return 'Internal authentication error. Try again later.';
    if (message.includes('auth/cancelled-popup-request')) return 'Sign-in cancelled. Please try again.';
    if (message.includes('No user returned')) return 'Sign-in incomplete. Please try again.';
    return 'Sign-in failed. Please try again.';
  }
}
