import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  UrlTree
} from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects routes by ensuring user is authenticated.
 * Waits for Firebase auth initialization before deciding.
 */
export const AuthGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // ✅ Wait until Firebase finishes checking for existing session
  await authService.waitForAuthResolved();

  // ✅ If authenticated, allow route activation
  if (authService.isAuthenticated()) {
    return true;
  }

  // 🚫 Otherwise, redirect to login
  return router.parseUrl('/login');
};
