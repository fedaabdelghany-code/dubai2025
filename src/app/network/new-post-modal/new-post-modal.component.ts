import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Auth, User, onAuthStateChanged } from '@angular/fire/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-new-post-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './new-post-modal.component.html',
  styleUrls: ['./new-post-modal.component.scss'],
})
export class NewPostModalComponent implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private modalCtrl = inject(ModalController);
  private zone = inject(NgZone);
  private unsubscribeAuth?: () => void;

  userName = '';
  userPhoto = '';
  caption = '';
  photoURL?: string;
  isLoading = false;
  imageLoadError = false;

  ngOnInit() {
    // Set user immediately if cached
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      this.setUserData(currentUser);
    }

    // ✅ Subscribe to auth state within Angular Zone for proper change detection
    this.unsubscribeAuth = onAuthStateChanged(this.auth, (user: User | null) => {
      this.zone.run(() => {
        if (user) {
          this.setUserData(user);
        } else {
          this.userName = 'Guest';
          this.userPhoto = 'assets/user.png';
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  }

  private setUserData(user: User) {
    this.userName = this.toTitleCase(user.displayName || 'Anonymous');

    let photoURL =
      user.photoURL ||
      user.providerData[0]?.photoURL ||
      'assets/user.png';

    // If Google photo, upscale resolution
    if (photoURL.includes('googleusercontent.com')) {
      photoURL = photoURL.replace(/=s\d+-c/, '=s400-c');
    }

    this.userPhoto = photoURL;
  }

  private toTitleCase(name: string): string {
    return name
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  triggerUpload() {
    document.getElementById('photoUpload')?.click();
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      console.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      console.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => (this.photoURL = e.target.result);
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.photoURL = undefined;
  }

  async createPost() {
    if (!this.caption.trim()) {
      console.error('Caption is required');
      return;
    }

    this.isLoading = true;
    await this.modalCtrl.dismiss({
      userName: this.userName,
      userPhoto: this.userPhoto,
      caption: this.caption,
      photoURL: this.photoURL,
    });
  }

  closeModal() {
    this.modalCtrl.dismiss();
  }

  onImageError(event: any) {
    console.error('Image failed to load:', this.userPhoto);
    this.imageLoadError = true;
    event.target.src = 'assets/user.png';
  }
}
