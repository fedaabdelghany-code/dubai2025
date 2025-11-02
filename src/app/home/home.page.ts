import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonModal, IonButton, IonCardTitle, IonCard, IonCardHeader, IonCardContent } from '@ionic/angular/standalone';
import { Auth, signOut } from '@angular/fire/auth';
import { DataService } from '../services/data.service';
import { onAuthStateChanged, User } from '@angular/fire/auth';

import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  Timestamp,
} from '@angular/fire/firestore';
import {
  Observable,
  Subject,
  interval,
  combineLatest,
  map,
  takeUntil,
  shareReplay,
} from 'rxjs';
import { RouterModule } from '@angular/router';

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
  startTime: any; // Firestore Timestamp
  endTime: any;   // Firestore Timestamp
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

type MessageType = 'today' | 'over' | null;

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonCardContent, IonCardHeader, IonCard, IonCardTitle, IonButton, IonModal, IonContent, IonIcon, CommonModule, DatePipe, RouterModule],
})
export class HomePage implements OnInit, OnDestroy {
  /* Public observables / properties used by the template */
  public primarySession: Session | null = null;
  public secondarySession: Session | null = null;
  public todaySessions$!: Observable<Session[]>;
  public announcements$!: Observable<Announcement[]>;
  public messageType: MessageType = null;
  public currentDay = 1;
  public showQR = false;
  displayName: string | null = null;


  /* Internal */
  private destroy$ = new Subject<void>();
  private readonly TICK_MS = 1000;

  constructor(private router: Router, private firestore: Firestore, private auth: Auth, private data: DataService,   
) {}

ngOnInit() {
  const sessions$ = this.data.sessions$;
  this.announcements$ = this.data.announcements$;

  const tick$ = interval(this.TICK_MS);


onAuthStateChanged(this.auth, (user: User | null) => {
  if (user && user.displayName) {
    this.displayName = this.formatDisplayName(user.displayName);

  } else {
    this.displayName = null;
  }
});
  
  combineLatest([sessions$, tick$])
    .pipe(
      map(([sessions]) => {
        this.currentDay = this.calculateCurrentDayFromSessions(sessions);
        return this.evaluateSessions(sessions);
      }),
      takeUntil(this.destroy$)
    )
    .subscribe(({ primary, secondary, messageType }) => {
      this.primarySession = primary;
      this.secondarySession = secondary;
      this.messageType = messageType;
    });

  this.todaySessions$ = sessions$.pipe(
    map((sessions) => {
      const currentDay = this.calculateCurrentDayFromSessions(sessions);
      return sessions.filter(s => this.normalizeDay(s.day) === currentDay.toString()).slice(0, 3);
    }),
    shareReplay(1)
  );
}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Calculate current day based on sessions themselves (not hardcoded dates)
   * Returns the day number (1, 2, 3, etc.) based on which day's sessions are active
   */

  private formatDisplayName(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

  private calculateCurrentDayFromSessions(sessions: Session[]): number {
    if (!sessions || sessions.length === 0) return 1;

    const now = new Date();

    // Group sessions by day
    const sessionsByDay = new Map<string, Session[]>();
    sessions.forEach(session => {
      const day = this.normalizeDay(session.day);
      if (!sessionsByDay.has(day)) {
        sessionsByDay.set(day, []);
      }
      sessionsByDay.get(day)!.push(session);
    });

    // Sort days numerically
    const sortedDays = Array.from(sessionsByDay.keys())
      .map(d => parseInt(d))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b);

    if (sortedDays.length === 0) return 1;

    // Find which day we're currently in
    for (const dayNum of sortedDays) {
      const daySessions = sessionsByDay.get(dayNum.toString()) || [];
      if (daySessions.length === 0) continue;

      // Sort sessions by start time
      daySessions.sort((a, b) => 
        this.toDate(a.startTime).getTime() - this.toDate(b.startTime).getTime()
      );

      const firstSession = daySessions[0];
      const lastSession = daySessions[daySessions.length - 1];

      const dayStart = this.toDate(firstSession.startTime);
      const dayEnd = this.toDate(lastSession.endTime);

      // If we're before this day's first session, we're in a previous day or this day
      if (now < dayStart) {
        // Return previous day if it exists, otherwise this day
        const prevDay = sortedDays[sortedDays.indexOf(dayNum) - 1];
        return prevDay || dayNum;
      }

      // If we're within this day's range (before last session ends)
      if (now >= dayStart && now < dayEnd) {
        return dayNum;
      }

      // If we're after this day's last session, check if there's a next day
      if (now >= dayEnd) {
        const nextDayIndex = sortedDays.indexOf(dayNum) + 1;
        // If there's no next day, we're still on this day (it's over but it's still "today")
        if (nextDayIndex >= sortedDays.length) {
          return dayNum;
        }
        // If there is a next day, check if we should roll over to it
        const nextDay = sortedDays[nextDayIndex];
        const nextDaySessions = sessionsByDay.get(nextDay.toString()) || [];
        if (nextDaySessions.length > 0) {
          const nextDayFirstSession = nextDaySessions.sort((a, b) => 
            this.toDate(a.startTime).getTime() - this.toDate(b.startTime).getTime()
          )[0];
          const nextDayStart = this.toDate(nextDayFirstSession.startTime);
          
          // If we're past midnight and before next day's first session, roll to next day
          const currentDate = this.toLocalDateStr(now);
          const nextDayDate = this.toLocalDateStr(nextDayStart);
          
          if (currentDate === nextDayDate && now < nextDayStart) {
            return nextDay;
          }
        }
        // Otherwise continue checking (might be between days)
        continue;
      }
    }

    // Default: return the last day
    return sortedDays[sortedDays.length - 1];
  }

  /**
   * Normalize day field to just the number (handles "1", "Day 1", "day 1", etc.)
   */
  private normalizeDay(day: string | undefined): string {
    if (!day) return '1';
    return day.toString().toLowerCase().replace(/[^0-9]/g, '');
  }

  /**
   * Load sessions from Firestore ordered by startTime asc.
   */
  private loadSessionsObservable(): Observable<Session[]> {
    const sessionsRef = collection(this.firestore, 'sessions');
    const q = query(sessionsRef, orderBy('startTime', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Session[]>;
  }

  /**
   * Core logic: determines which sessions are LIVE/UP NEXT for current day only
   */
  private evaluateSessions(sessions: Session[]): {
    primary: Session | null;
    secondary: Session | null;
    messageType: MessageType;
  } {
    const now = new Date();

    if (!sessions || sessions.length === 0) {
      return { primary: null, secondary: null, messageType: 'over' };
    }

    // Filter to current day's sessions
    const todaySessions = sessions.filter((s) => 
      this.normalizeDay(s.day) === this.currentDay.toString()
    );

    // If no sessions today, determine if event is over or just done for the day
    if (todaySessions.length === 0) {
      const allDays = sessions.map(s => parseInt(this.normalizeDay(s.day))).filter(d => !isNaN(d));
      const maxDay = Math.max(...allDays);
      
      // If current day is beyond max day, event is over
      if (this.currentDay > maxDay) {
        return { primary: null, secondary: null, messageType: 'over' };
      }
      
      // Otherwise, just no sessions today (shouldn't happen with proper data)
      return { primary: null, secondary: null, messageType: 'today' };
    }

    // Sort sessions by start time
    todaySessions.sort(
      (a, b) => this.toDate(a.startTime).getTime() - this.toDate(b.startTime).getTime()
    );

    // Check for LIVE session
    const liveSession = todaySessions.find(
      (s) => this.toDate(s.startTime) <= now && this.toDate(s.endTime) > now
    );

    if (liveSession) {
      // Find next session AFTER the live one (today only)
      const liveIndex = todaySessions.findIndex((s) => s.id === liveSession.id);
      const nextSession = todaySessions
        .slice(liveIndex + 1)
        .find((s) => this.toDate(s.startTime) > now) || null;
      
      return { 
        primary: liveSession, 
        secondary: nextSession, 
        messageType: null 
      };
    }

    // No live session - find next upcoming session (today only)
    const upcomingSession = todaySessions.find(
      (s) => this.toDate(s.startTime) > now
    );

    if (upcomingSession) {
      return { 
        primary: upcomingSession, 
        secondary: null, 
        messageType: null 
      };
    }

    // No live or upcoming sessions today
    // Check if this is the last day of the event
    const allDays = sessions.map(s => parseInt(this.normalizeDay(s.day))).filter(d => !isNaN(d));
    const maxDay = Math.max(...allDays);
    
    if (this.currentDay >= maxDay) {
      // This is the last day and all sessions are done
      return { primary: null, secondary: null, messageType: 'over' };
    }

    // There are more days ahead, today is just done
    return { primary: null, secondary: null, messageType: 'today' };
  }

  // ---------- Helper utilities ----------

  /** Safely convert Firestore Timestamp or Date-like to JS Date */
  private toDate(tsOrDate: any): Date {
    if (!tsOrDate) return new Date(NaN);
    if (tsOrDate instanceof Timestamp) return tsOrDate.toDate();
    if (tsOrDate?.toDate && typeof tsOrDate.toDate === 'function') return tsOrDate.toDate();
    if (tsOrDate instanceof Date) return tsOrDate;
    return new Date(tsOrDate);
  }

  /** Local date string 'YYYY-MM-DD' */
  private toLocalDateStr(d: Date): string {
    const year = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  public getTimeUntil(session: Session | null): string {
    if (!session) return '';
    const now = new Date();
    const start = this.toDate(session.startTime);
    const end = this.toDate(session.endTime);

    // Live now?
    if (now >= start && now < end) {
      const remainingMs = end.getTime() - now.getTime();
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      if (mins > 0) return `Live • ${mins}m ${secs}s left`;
      return `Live • ${secs}s left`;
    }

    // Before start
    const diffMs = start.getTime() - now.getTime();
    if (diffMs <= 0) return 'Starting now';
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 60) return `Starts in ${diffMinutes} min`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes === 0 ? `Starts in ${hours}h` : `Starts in ${hours}h ${minutes}m`;
  }

  public isLive(session: Session | null): boolean {
    if (!session) return false;
    const now = new Date();
    const start = this.toDate(session.startTime);
    const end = this.toDate(session.endTime);
    return start <= now && now < end;
  }

  shouldDisplaySpeaker(session: Session | undefined | null): boolean {
    if (!session?.speaker) return false;
    if (!session.speaker.name) return false;
    const speakerName = session.speaker.name.trim().toLowerCase();
    return speakerName !== 'all' && speakerName !== '';
  }

  // ---------- Announcements ----------

  private loadAnnouncements() {
    const announcementsRef = collection(this.firestore, 'announcements');
    const q = query(announcementsRef, orderBy('timestamp', 'desc'));
    this.announcements$ = collectionData(q, { idField: 'id' }).pipe(
      map((ann: any[]) =>
        ann.sort((a, b) => this.toDate(b.timestamp).getTime() - this.toDate(a.timestamp).getTime())
      ),
      shareReplay(1)
    );
  }

  // ---------- Navigation / UI helpers ----------

  navigateToAgenda() {
    this.router.navigate(['tabs/agenda']);
  }

  goToAgendaSession(session: Session) {
    this.router.navigate(['tabs/agenda'], {
      queryParams: { sessionId: session.id, day: session.day },
      state: { fromHome: true },
    });
  }

  openNetworking() {
    this.router.navigate(['/tabs/network']);
  }

  openTips() {
        this.router.navigate(['/tips']);

  }
  openPhotos() {
    console.log('Opening photos gallery');
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

  navigateToVenue() {
    this.router.navigate(['/venue']);
  }

  logoutUser() {
    signOut(this.auth)
      .then(() => {
        console.log('[SSO] User signed out');
        this.router.navigateByUrl('/login', { replaceUrl: true });
      })
      .catch((err) => console.error('[SSO] Logout error:', err));
  }

  openHSEInduction() {
  this.router.navigate(['/hse-induction']);
}


}
