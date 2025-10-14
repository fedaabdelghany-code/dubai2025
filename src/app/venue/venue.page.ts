import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent, IonIcon, IonGrid, IonRow, IonCol } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mapOutline, chevronForwardOutline } from 'ionicons/icons';
import { IonButtons, IonButton } from '@ionic/angular/standalone';
import { closeOutline } from 'ionicons/icons';
import { Router } from '@angular/router';

interface Location {
  icon: string;
  name: string;
  desc: string;
}

interface Room {
  name: string;
  subtitle: string;
  color: string;
  type: 'hall' | 'room';
}

@Component({
  selector: 'app-venue',
  templateUrl: './venue.page.html',
  styleUrls: ['./venue.page.scss'],
  standalone: true,
imports: [
  CommonModule,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonButtons,
  IonButton
]
})
export class VenuePage {
  halls: Room[] = [
    { name: 'Hall A', subtitle: 'Main Stage', color: '#94C12E', type: 'hall' },
    { name: 'Hall B', subtitle: 'Breakouts', color: '#00A9E0', type: 'hall' }
  ];

  rooms: Room[] = [
    { name: 'Room 1', subtitle: '', color: '', type: 'room' },
    { name: 'Room 2', subtitle: '', color: '', type: 'room' },
    { name: 'Room 3', subtitle: '', color: '', type: 'room' }
  ];

  locations: Location[] = [
    { icon: '🎤', name: 'Hall A - Main Stage', desc: 'Keynotes & plenary sessions' },
    { icon: '💼', name: 'Breakout Rooms 1-6', desc: 'Second floor' },
    { icon: '☕', name: 'Networking Lounge', desc: 'Refreshments & casual meetings' },
    { icon: '🎪', name: 'Exhibition Area', desc: 'Sponsor booths & demos' }
  ];

constructor(private router: Router) {
  addIcons({ mapOutline, chevronForwardOutline, closeOutline });
}


  onRoomClick(room: Room): void {
    console.log('Room clicked:', room.name);
    // Implement navigation or modal logic here
  }

  onLocationClick(location: Location): void {
    console.log('Location clicked:', location.name);
    // Implement navigation or modal logic here
  }

  closeVenue() {
  this.router.navigate(['tabs/home']);
}

}
