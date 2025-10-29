import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { DataService } from '../services/data.service';

@Injectable({ providedIn: 'root' })
export class DataPrefetchGuard implements CanActivate {
  constructor(private dataService: DataService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    try {
      // Start background data fetch before entering the route
      this.dataService.initData();
      return true;
    } catch (error) {
      console.error('[DataPrefetchGuard] Failed to prefetch data:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
}
