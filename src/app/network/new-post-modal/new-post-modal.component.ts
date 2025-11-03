import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, ActionSheetController, LoadingController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Auth, User, onAuthStateChanged } from '@angular/fire/auth';
import { ImageUploadService } from '../../services/image-upload.service';

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
  private actionSheetCtrl = inject(ActionSheetController);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);
  private imageUploadService = inject(ImageUploadService);
  private unsubscribeAuth?: () => void;

  userName = '';
  userPhoto = '';
  caption = '';
  selectedImageDataUrl?: string; // Base64 data URL for preview
  uploadedImageUrl?: string; // Firebase Storage URL after upload
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

  /**
   * Show action sheet to choose image source (Camera or Gallery)
   * For PWA: Both options use file input, but camera option requests camera on mobile
   */
  async selectImageSource() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Add Photo',
      buttons: [
        {
          text: 'Take Photo',
          icon: 'camera',
          handler: () => {
            this.takePhoto();
          },
        },
        {
          text: 'Choose from Gallery',
          icon: 'images',
          handler: () => {
            this.pickFromGallery();
          },
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  /**
   * Take photo with camera (opens camera on mobile browsers)
   */
  async takePhoto() {
    const dataUrl = await this.imageUploadService.takePhoto();
    if (dataUrl) {
      this.selectedImageDataUrl = dataUrl;
    }
  }

  /**
   * Pick image from gallery (opens file picker)
   */
  async pickFromGallery() {
    const dataUrl = await this.imageUploadService.pickImageFromGallery();
    if (dataUrl) {
      this.selectedImageDataUrl = dataUrl;
    }
  }

  /**
   * Legacy method for web file input (fallback)
   */
  triggerUpload() {
    document.getElementById('photoUpload')?.click();
  }

  /**
   * Handle file selection from web input
   */
  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showAlert('Error', 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showAlert('Error', 'Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedImageDataUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Remove selected photo
   */
  removePhoto() {
    this.selectedImageDataUrl = undefined;
    this.uploadedImageUrl = undefined;
  }

  /**
   * Create post and upload image to Firebase Storage
   */
async createPost() {
  console.log('[createPost] Starting post creation...');
  
  if (!this.caption.trim() && !this.selectedImageDataUrl) {
    console.warn('[createPost] Missing caption and image');
    this.showAlert('Error', 'Please add a caption or photo');
    return;
  }

  const loading = await this.loadingCtrl.create({
    message: 'Posting...',
    spinner: 'crescent',
  });
  await loading.present();

  try {
    let photoURL: string | undefined = undefined;
    const user = this.auth.currentUser;

    if (!user) {
      console.error('[createPost] No authenticated user found');
      throw new Error('User not authenticated');
    }

    console.log('[createPost] Authenticated user:', user.uid);

    // ✅ If image selected
    if (this.selectedImageDataUrl) {
      console.log('[createPost] Compressing image...');
      const compressedImage = await this.imageUploadService.compressImage(
        this.selectedImageDataUrl,
        1200,
        0.8
      );

      console.log('[createPost] Uploading image...');
      photoURL = await this.imageUploadService.uploadPostImage(
        compressedImage,
        user.uid
      );

      console.log('[createPost] Image uploaded successfully:', photoURL);
      this.uploadedImageUrl = photoURL;
    } else {
      console.log('[createPost] No image selected, caption only post.');
    }

    // ✅ Log what will be sent to parent modal
    console.log('[createPost] Dismissing modal with data:', {
      caption: this.caption,
      photoURL: photoURL,
    });

    await loading.dismiss();

    // ✅ Return post data to parent component
await this.modalCtrl.dismiss(
  {
    caption: this.caption,
    photoURL: photoURL,
  },
  'post' // ✅ explicitly mark role as 'post'
);

    console.log('[createPost] Modal dismissed successfully.');
  } catch (error) {
    await loading.dismiss();
    console.error('[createPost] Error:', error);
    this.showAlert('Error', 'Failed to upload image. Please try again.');
  }
}
  /**
   * Close modal without posting
   */
  closeModal() {
    this.modalCtrl.dismiss();
  }

  /**
   * Handle user avatar image load error
   */
  onImageError(event: any) {
    console.error('Image failed to load:', this.userPhoto);
    this.imageLoadError = true;
    event.target.src = 'assets/user.png';
  }

  /**
   * Check if post button should be enabled
   */
  canPost(): boolean {
    return this.caption.trim().length > 0 || !!this.selectedImageDataUrl;
  }

  /**
   * Show alert dialog
   */
  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}