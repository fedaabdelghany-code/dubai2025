import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signOut } from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user = new BehaviorSubject<User | null>(null);
  public user$ = this._user.asObservable();

  constructor(private auth: Auth) {
    // Listen for Firebase auth state changes
    onAuthStateChanged(this.auth, (user) => {
      this._user.next(user); // update current user
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    });

    // Restore user from localStorage if page reloads
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        this._user.next(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }

  get currentUser(): User | null {
    return this._user.value;
  }

  isLoggedIn(): boolean {
    return !!this._user.value;
  }

  async signInWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    this._user.next(result.user);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result.user;
  }

  async logout() {
    await signOut(this.auth);
    this._user.next(null);
    localStorage.removeItem('user');
  }
}
