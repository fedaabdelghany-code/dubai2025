import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';

interface Person {
  name: string;
  title: string;
  country: string;
  flag: string;
  connected: boolean;
}

@Component({
  selector: 'app-network',
  standalone: true,
  templateUrl: './network.page.html',
  styleUrls: ['./network.page.scss'],
  imports: [IonContent, IonIcon, IonButton, CommonModule, FormsModule],
})
export class NetworkPage {
  @ViewChild('videoPreview', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private scanner = new BrowserMultiFormatReader();
  private currentStream: MediaStream | null = null;
  scanning = false;
  scanResult: string | null = null;

  networkTab: 'attendees' | 'speakers' | 'connections' = 'attendees';
  showQR = false;
  searchQuery = '';

  people: Person[] = [
    { name: 'Sarah Chen', title: 'VP Strategy, APAC', country: 'Singapore', flag: '🇸🇬', connected: false },
    { name: 'Alex Kumar', title: 'Director of Innovation', country: 'India', flag: '🇮🇳', connected: true },
    { name: 'Maria Santos', title: 'Regional Manager', country: 'Philippines', flag: '🇵🇭', connected: false },
    { name: 'Ahmed Hassan', title: 'Head of Operations', country: 'UAE', flag: '🇦🇪', connected: true },
  ];

  constructor() {}

  // Tabs + Search Logic
  setNetworkTab(tab: 'attendees' | 'speakers' | 'connections') {
    this.networkTab = tab;
  }
  toggleQR(show: boolean) {
    this.showQR = show;
  }
  onSearchChange(event: any) {
    this.searchQuery = event.target.value || '';
  }
  getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('');
  }
  toggleConnection(person: Person) {
    person.connected = !person.connected;
  }

  // ✅ Open Camera & Scan QR
  async switchToScanMode() {
    if (this.scanning) return;
    this.scanResult = null;
    this.scanning = true;

    try {
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      if (!devices || devices.length === 0) {
        alert('No camera found.');
        this.scanning = false;
        return;
      }

      const backCamera =
        devices.find((d) => d.label.toLowerCase().includes('back')) || devices[0];

      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: backCamera.deviceId },
      });

      const video = this.videoElement.nativeElement;
      video.srcObject = this.currentStream;
      await video.play();

      // ✅ decodeFromVideoDevice uses callback, no reset needed
      this.scanner.decodeFromVideoDevice(backCamera.deviceId, video, (result: Result | undefined, error) => {
        if (result) {
          this.scanResult = result.getText();
          console.log('✅ QR Scanned:', this.scanResult);
          this.stopScan();
          if (this.scanResult) {
            this.handleScanResult(this.scanResult);
          }
        }
      });
    } catch (err) {
      console.error('Camera error:', err);
      alert('Could not access camera.');
      this.scanning = false;
    }
  }

  // ✅ Manually stop camera tracks (no deprecated methods)
  stopScan() {
    this.scanning = false;
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  // Handle result
  handleScanResult(result: string) {
    if (result.startsWith('http')) {
      window.open(result, '_blank');
    } else {
      alert('Scanned: ' + result);
    }
  }
}
