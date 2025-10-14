import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, 
    IonCardContent, IonCard, IonButtons, IonModal, IonBadge } from '@ionic/angular/standalone';
import { CommonModule, DatePipe } from '@angular/common';
import { Observable } from 'rxjs';

// Define interfaces for type safety
interface Announcement {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  priority: string;
}

interface Session {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  day: number;
}

interface CurrentUser {
  uid: string;
  name: string;
  email: string;
  company: string;
  qrCode: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, 
    IonCardContent, IonCard, IonButtons, IonModal, IonBadge,
    CommonModule,
    DatePipe
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  showQR = false;
  
  public announcements$!: Observable<Announcement[]>;
  public nextSession$!: Observable<Session | undefined>;
  public userAgenda$!: Observable<any[]>;
  
  public conferenceInfo: any; 
  public currentUser!: CurrentUser; 

  private currentUserId = 'user_001'; 
  public currentDay = 2; 
  firebaseService: any;

  constructor(
    private router: Router, 
  ) {}

  ngOnInit() {
  }

  openQRCode() {
    this.showQR = true;
  }

  closeQRCode() {
    this.showQR = false;
  }

  navigateToVenue() {
    this.router.navigate(['/venue']);
  }

  navigateToAgenda() {
    this.router.navigate(['tabs/agenda']);
  }
}