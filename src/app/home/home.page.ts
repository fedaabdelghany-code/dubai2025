import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonModal } from '@ionic/angular/standalone';
import { Firestore, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

interface Announcement {
  id: string;
  title: string;
  description: string;
  timestamp: any;
  active: boolean;
  priority: string;
}

interface Session {
  id: string;
  title: string;
  startTime: any;
  endTime: any;
  location: string;
  day: string;
  description: string;
  category: string;
  color: string;
  isGeneral: boolean;
  speaker?: {
    name: string;
    title: string;
    photoURL: string | null;
    userID: string;
  };
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonModal, IonContent, IonIcon, CommonModule, DatePipe],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  public nextSession$!: Observable<Session | null>;
  public announcements$!: Observable<Announcement[]>;
  public todaySessions$!: Observable<Session[]>;

  public messageType: 'today' | 'over' | null = null;
  public currentDay: number = 1;
  showQR: boolean = false;

  constructor(private router: Router, private firestore: Firestore) {}

  ngOnInit() {
    this.calculateCurrentDay();
    this.loadNextSession();
    this.loadAnnouncements();
    this.loadTodaySessions();
  }

  private calculateCurrentDay() {
    // Convention starts November 10, 2025 in Dubai timezone (GMT+4)
    const conventionStart = new Date('2025-11-10T00:00:00+04:00');
    const now = new Date();
    
    // Convert current time to Dubai timezone
    const dubaiOffset = 4 * 60; // GMT+4 in minutes
    const localOffset = now.getTimezoneOffset();
    const dubaiTime = new Date(now.getTime() + (dubaiOffset + localOffset) * 60000);
    
    // Calculate days difference
    const diffTime = dubaiTime.getTime() - conventionStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Day 1, 2, or 3 (default to Day 1 if before start or after Day 3)
    if (diffDays < 0) {
      this.currentDay = 1;
    } else if (diffDays >= 3) {
      this.currentDay = 3;
    } else {
      this.currentDay = diffDays + 1;
    }
  }

  private loadNextSession() {
    const now = new Date();
    const sessionsRef = collection(this.firestore, 'sessions');
    const q = query(sessionsRef, orderBy('startTime', 'asc'));

    this.nextSession$ = collectionData(q, { idField: 'id' }).pipe(
      map((sessions: any[]) => {
        if (!sessions.length) {
          this.messageType = 'over';
          return null;
        }

        const upcoming = sessions.find((s) => s.startTime.toDate() > now);

        if (upcoming) {
          this.messageType = null;
          return upcoming;
        }

        const lastSession = sessions[sessions.length - 1];
        const lastEnd = lastSession.endTime.toDate();

        if (now.toDateString() === lastEnd.toDateString()) {
          this.messageType = 'today';
        } else if (now > lastEnd) {
          this.messageType = 'over';
        }

        return null;
      })
    );
  }

  private loadAnnouncements() {
    const announcementsRef = collection(this.firestore, 'announcements');
    const q = query(announcementsRef, orderBy('timestamp', 'desc'));

    this.announcements$ = collectionData(q, { idField: 'id' }).pipe(
      map((announcements: any[]) =>
        announcements.sort(
          (a, b) =>
            b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime()
        )
      )
    );
  }

  private loadTodaySessions() {
  const sessionsRef = collection(this.firestore, 'sessions');
  const q = query(sessionsRef, orderBy('startTime', 'asc'));

  this.todaySessions$ = collectionData(q, { idField: 'id' }).pipe(
    map((sessions: any[]) => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // compare only date portion

      // filter by day (if you use explicit day field in Firestore)
      const todaySessions = sessions.filter((s) => {
        const startDate = s.startTime?.toDate?.().toISOString().split('T')[0];
        return s.day === `Day ${this.currentDay}` || startDate === todayStr;
      });

      return todaySessions.slice(0, 3); // limit to 3 sessions for home card
    })
  );
}


  // Helper method to check if speaker should be displayed
  shouldDisplaySpeaker(session: Session): boolean {
    if (!session.speaker) return false;
    if (!session.speaker.name) return false;
    const speakerName = session.speaker.name.trim().toLowerCase();
    return speakerName !== 'all' && speakerName !== '';
  }

  navigateToAgenda() {
    this.router.navigate(['tabs/agenda']);
  }

  navigateToVenue() {
    this.router.navigate(['/venue']);
  }

  openQRCode() {
    this.showQR = true;
  }

  closeQRCode() {
    this.showQR = false;
  }

  timeAgo(timestamp: any): string {
    if (!timestamp?.toDate) return '';
    const now = new Date();
    const t = timestamp.toDate();
    const diffMs = now.getTime() - t.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  getTimeUntil(session: Session): string {
  if (!session?.startTime?.toDate) return '';
  const now = new Date();
  const start = session.startTime.toDate();
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Now live';
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return `Starts in ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  const remainingMinutes = diffMinutes % 60;

  if (remainingMinutes === 0) {
    return `Starts in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }

  return `Starts in ${diffHours}h ${remainingMinutes}m`;
}

goToAgendaSession(session: Session) {
  // Pass both the day and the session ID as query params
  this.router.navigate(['tabs/agenda'], {
    queryParams: {
      sessionId: session.id,
      day: session.day
    }
  });
}


}