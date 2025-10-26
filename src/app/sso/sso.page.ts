import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-sso',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './sso.page.html',
  styleUrls: ['./sso.page.scss'],
})
export class SsoPage {
  private auth = inject(Auth);
  private router = inject(Router);
  private notify = inject(NotificationService);

  async signInWithGoogle() {
    console.log('[SSO] Google Sign-In Flow started');

    const provider = new GoogleAuthProvider();
    
    try {
      console.log('[SSO] Opening popup...');
      const result = await signInWithPopup(this.auth, provider);
      console.log('[SSO] ✅ Popup completed successfully');
      
      const user = result.user;

      if (user) {
        console.log('[SSO] User signed in:', user.email);
        this.notify.showToast(`Welcome, ${user.displayName}!`, 'success');
        
        console.log('[SSO] Navigating to /tabs/home');
        await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
        console.log('[SSO] Navigation completed');
      }
    } catch (error: any) {
      console.error('[SSO] ❌ Sign-in error:', error);
      console.error('[SSO] Error code:', error.code);
      console.error('[SSO] Error message:', error.message);
      
      const message = this.formatError(error.code || error.message);
      this.notify.showToast(message, 'warning');
    }
  }

  private formatError(message: string): string {
    if (!message) return 'Unknown error occurred.';

    if (message.includes('popup-closed-by-user'))
      return 'Sign-in cancelled. Please try again.';
    if (message.includes('auth/network-request-failed'))
      return 'Network error. Please check your connection.';
    if (message.includes('auth/unauthorized-domain'))
      return 'Unauthorized domain. Please contact support.';
    if (message.includes('auth/popup-blocked'))
      return 'Popup was blocked. Please enable popups and try again.';
    if (message.includes('auth/internal-error'))
      return 'Internal authentication error. Try again later.';

    return 'Sign-in failed. Please try again.';
  }
}