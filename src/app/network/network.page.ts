import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { map, Observable, BehaviorSubject, combineLatest } from 'rxjs';

interface Person {
  id: string;
  name: string;
  title: string;
  country: string;
  photoURL?: string | null;
  flag: string;
  connected: boolean;
  role: 'attendee' | 'speaker';
}

@Component({
  selector: 'app-network',
  standalone: true,
  templateUrl: './network.page.html',
  styleUrls: ['./network.page.scss'],
  imports: [IonContent, IonIcon, IonButton, CommonModule, FormsModule],
})
export class NetworkPage implements OnInit {
  @ViewChild('videoPreview', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  private scanner = new BrowserMultiFormatReader();
  private currentStream: MediaStream | null = null;

  scanning = false;
  scanResult: string | null = null;
  showQR = false;
  searchQuery = '';

  networkTab: 'attendees' | 'speakers' | 'connections' = 'attendees';
  
  // Observables for reactive filtering
  private allPeople$ = new BehaviorSubject<Person[]>([]);
  private searchQuery$ = new BehaviorSubject<string>('');
  private networkTab$ = new BehaviorSubject<'attendees' | 'speakers' | 'connections'>('attendees');
  
  people$: Observable<Person[]>;

  constructor(private firestore: Firestore) {
    // Combine all filters reactively
    this.people$ = combineLatest([
      this.allPeople$,
      this.searchQuery$,
      this.networkTab$
    ]).pipe(
      map(([people, query, tab]) => {
        let filtered = people;

        // Apply search filter
        if (query.trim()) {
          const lowerQuery = query.toLowerCase();
          filtered = filtered.filter((p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.title.toLowerCase().includes(lowerQuery) ||
            p.country.toLowerCase().includes(lowerQuery)
          );
        }

        // Apply tab filter
        if (tab === 'attendees') {
          filtered = filtered.filter((p) => p.role === 'attendee');
        } else if (tab === 'speakers') {
          filtered = filtered.filter((p) => p.role === 'speaker');
        } else if (tab === 'connections') {
          filtered = filtered.filter((p) => p.connected);
        }

        return filtered;
      })
    );
  }

  ngOnInit() {
    this.loadPeople();
  }

  // Fetch users dynamically from Firestore
  private loadPeople() {
    const usersRef = collection(this.firestore, 'users');
    collectionData(usersRef, { idField: 'id' }).pipe(
      map((users: any[]) =>
        users.map((u) => ({
          id: u.id,
          name: u.displayName || 'Unknown User',
          title: u.position || 'Attendee',
          country: u.country || 'Unknown',
          photoURL: u.photoURL || null,
          flag: this.getCountryCode(u.country),
          connected: false,
          role: this.isSpeaker(u.position) ? 'speaker' as const : 'attendee' as const,
        }))
      )
    ).subscribe((people) => {
      this.allPeople$.next(people);
    });
  }

  // Simple rule: treat as speaker if position contains 'Director', 'Manager', or 'VP'
  private isSpeaker(position: string): boolean {
    const keywords = ['director', 'manager', 'vp', 'chief', 'head'];
    return keywords.some((k) => position?.toLowerCase().includes(k));
  }

  // Quick flag generator
  public getCountryCode(country: string): string {
    const map: Record<string, string> = {
      Egypt: 'eg',
      Singapore: 'sg',
      India: 'in',
      Philippines: 'ph',
      UAE: 'ae',
      'United States': 'us',
      France: 'fr',
      Germany: 'de',
    };
    return map[country] || 'un'; // 'un' = UN flag for unknown
  }

  // Tab switching
  setNetworkTab(tab: 'attendees' | 'speakers' | 'connections') {
    this.networkTab = tab;
    this.networkTab$.next(tab);
  }

  // Real-time search
  onSearchChange(query: string) {
    this.searchQuery = query;
    this.searchQuery$.next(query);
  }

  toggleConnection(person: Person) {
    person.connected = !person.connected;
    // Trigger update by emitting current people
    this.allPeople$.next(this.allPeople$.value);
  }

  getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('');
  }

  toggleQR(show: boolean) {
    this.showQR = show;
  }

  async switchToScanMode() {
    if (this.scanning) return;
    this.scanResult = null;
    this.scanning = true;

    setTimeout(async () => {
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

        this.scanner.decodeFromVideoDevice(backCamera.deviceId, video, (result) => {
          if (result) {
            this.scanResult = result.getText();
            this.stopScan();
            if (this.scanResult) this.handleScanResult(this.scanResult);
          }
        });
      } catch (err) {
        console.error('Camera error:', err);
        alert('Could not access camera.');
        this.scanning = false;
      }
    });
  }

  stopScan() {
    this.scanning = false;
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((t) => t.stop());
      this.currentStream = null;
    }
  }

  handleScanResult(result: string) {
    if (result.startsWith('http')) window.open(result, '_blank');
    else alert('Scanned: ' + result);
  }
}