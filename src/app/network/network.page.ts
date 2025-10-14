import { Component } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  templateUrl: 'network.page.html',
  styleUrls: ['network.page.scss'],
  imports: [IonContent, IonIcon, CommonModule, FormsModule]
})
export class NetworkPage {
  networkTab: 'attendees' | 'speakers' | 'connections' = 'attendees';
  showQR = false;
  searchQuery = '';

  people: Person[] = [
    { 
      name: 'Sarah Chen', 
      title: 'VP Strategy, APAC', 
      country: 'Singapore', 
      flag: '🇸🇬', 
      connected: false 
    },
    { 
      name: 'Alex Kumar', 
      title: 'Director of Innovation', 
      country: 'India', 
      flag: '🇮🇳', 
      connected: true 
    },
    { 
      name: 'Maria Santos', 
      title: 'Regional Manager', 
      country: 'Philippines', 
      flag: '🇵🇭', 
      connected: false 
    },
    { 
      name: 'Ahmed Hassan', 
      title: 'Head of Operations', 
      country: 'UAE', 
      flag: '🇦🇪', 
      connected: true 
    }
  ];

  constructor() {}

  setNetworkTab(tab: 'attendees' | 'speakers' | 'connections') {
    this.networkTab = tab;
  }

  toggleQR(show: boolean) {
    this.showQR = show;
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('');
  }

  toggleConnection(person: Person) {
    person.connected = !person.connected;
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value || '';
  }

  switchToScanMode() {
    console.log('Switching to scan mode');
    // Implement scanner logic here
  }
}