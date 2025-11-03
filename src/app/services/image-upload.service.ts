import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  constructor(private storage: Storage) {}

  /**
   * Pick image from device (web-based file input)
   * @param acceptCamera Whether to allow camera capture on mobile browsers
   */
  async pickImage(acceptCamera: boolean = true): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      // Enable camera on mobile browsers
      if (acceptCamera) {
        input.capture = 'environment'; // Use back camera
      }

      input.onchange = (event: any) => {
        const file = event.target.files[0];
        if (!file) {
          resolve(null);
          return;
        }

        if (!file.type.startsWith('image/')) {
          console.error('Please select an image file');
          resolve(null);
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          console.error('Image must be less than 10MB');
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e: any) => resolve(e.target.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };

      input.click();
    });
  }

  /**
   * Pick image from gallery (web file picker)
   */
  async pickImageFromGallery(): Promise<string | null> {
    return this.pickImage(false);
  }

  /**
   * Take photo with camera (mobile browser camera)
   */
  async takePhoto(): Promise<string | null> {
    return this.pickImage(true);
  }

  /**
   * Upload image to Firebase Storage
   * @param dataUrl Base64 data URL from file input
   * @param userId User ID for organizing files
   * @returns Download URL of uploaded image
   */
  async uploadPostImage(dataUrl: string, userId: string): Promise<string> {
    try {
      // Convert data URL to blob
      const blob = this.dataUrlToBlob(dataUrl);
      
      // Create unique filename with timestamp
      const timestamp = Date.now();
      const fileName = `posts/${userId}/${timestamp}.jpg`;
      
      // Create storage reference
      const storageRef = ref(this.storage, fileName);
      
      // Upload file
      console.log('Uploading image to:', fileName);
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg'
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Image uploaded successfully:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Delete image from Firebase Storage
   * @param imageUrl Full download URL of the image
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract path from URL
      const path = this.getPathFromUrl(imageUrl);
      if (!path) {
        console.warn('Could not extract path from URL:', imageUrl);
        return;
      }

      const storageRef = ref(this.storage, path);
      await deleteObject(storageRef);
      console.log('Image deleted successfully:', path);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Convert data URL to Blob
   */
  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  /**
   * Extract storage path from download URL
   */
  private getPathFromUrl(url: string): string | null {
    try {
      const decodedUrl = decodeURIComponent(url);
      const match = decodedUrl.match(/\/o\/(.+?)\?/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting path from URL:', error);
      return null;
    }
  }

  /**
   * Compress image before upload (for better performance)
   */
  async compressImage(dataUrl: string, maxWidth = 1200, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
}