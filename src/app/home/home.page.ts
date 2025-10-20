import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonModal } from '@ionic/angular/standalone';
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
  imports: [IonModal, IonContent, IonIcon, CommonModule, DatePipe, RouterModule],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  /* Public observables / properties used by the template */
  public primarySession: Session | null = null;   // LIVE NOW or UP NEXT (single main card)
  public secondarySession: Session | null = null; // shown only when there is a LIVE NOW and another upcoming session
  public todaySessions$!: Observable<Session[]>;
  public announcements$!: Observable<Announcement[]>;
  public messageType: MessageType = null;
  public currentDay = 1;
  public showQR = false;

  /* Internal */
  private destroy$ = new Subject<void>();
  private readonly TICK_MS = 1000; // update every second (change to 30000 for 30s updates)

  constructor(private router: Router, private firestore: Firestore) {}

  ngOnInit() {
    this.calculateCurrentDay();
    const sessions$ = this.loadSessionsObservable();
    const tick$ = interval(this.TICK_MS);

    // derive primary / secondary session reactively
    combineLatest([sessions$, tick$])
      .pipe(
        map(([sessions]) => this.evaluateSessions(sessions)),
        takeUntil(this.destroy$)
      )
      .subscribe(({ primary, secondary, messageType }) => {
        this.primarySession = primary;
        this.secondarySession = secondary;
        this.messageType = messageType;
      });

    // load UI lists
    this.todaySessions$ = sessions$.pipe(
      map((sessions) => {
        // return up to 3 sessions for the home overview (today-specific)
        const now = new Date();
        const todayStr = this.toLocalDateStr(now);

        const todaySessions = sessions.filter((s) => {
          const sStart = this.toDate(s.startTime);
          const startStr = this.toLocalDateStr(sStart);
          // check explicit day field variant: user might have '2' or 'Day 2' - attempt both
          const dayMatches =
            s.day === `${this.currentDay}` ||
            s.day === `Day ${this.currentDay}` ||
            s.day === `${this.currentDay}`;
          return dayMatches || startStr === todayStr;
        });

        return todaySessions.slice(0, 3);
      }),
      shareReplay(1)
    );

    this.loadAnnouncements();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load sessions from Firestore ordered by startTime asc.
   * Returns an Observable<Session[]>
   */
  private loadSessionsObservable(): Observable<Session[]> {
    const sessionsRef = collection(this.firestore, 'sessions');
    const q = query(sessionsRef, orderBy('startTime', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Session[]>;
  }

  /**
   * Core logic: given sorted sessions (by startTime asc), determine:
   * - primary: the LIVE NOW session (if any) else the nearest upcoming session (UP NEXT)
   * - secondary: the next session after primary (only shown when primary is LIVE NOW)
   * - messageType: 'today' | 'over' | null
   */
/**
 * Core logic: determines which sessions are LIVE/UP NEXT, but
 * now restricted to the current day's sessions only.
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

  // --- 1️⃣ Filter to sessions belonging to current day ---
  const todaySessions = sessions.filter((s) => {
    // Match against the 'day' field (supports "Day 1", "1", etc.)
    const normalizedDay = (s.day || '').toString().toLowerCase().replace('day ', '');
    return normalizedDay === this.currentDay.toString();
  });

  // if no sessions today but there are future days ahead → show 'today' message
  if (todaySessions.length === 0) {
    const futureSessions = sessions.filter((s) => {
      const normalizedDay = (s.day || '').toString().toLowerCase().replace('day ', '');
      return Number(normalizedDay) > this.currentDay;
    });
    return futureSessions.length > 0
      ? { primary: null, secondary: null, messageType: 'today' }
      : { primary: null, secondary: null, messageType: 'over' };
  }

  // ensure sorted by start time
  todaySessions.sort(
    (a, b) => this.toDate(a.startTime).getTime() - this.toDate(b.startTime).getTime()
  );

  // --- 2️⃣ Determine LIVE session (if any) ---
  const live = todaySessions.find(
    (s) => this.toDate(s.startTime) <= now && this.toDate(s.endTime) > now
  );

  if (live) {
    const idx = todaySessions.findIndex((s) => s.id === live.id);
    const next = todaySessions.slice(idx + 1).find((s) => this.toDate(s.startTime) > now) || null;
    return { primary: live, secondary: next, messageType: null };
  }

  // --- 3️⃣ No live session → look for next upcoming (today only) ---
  const upcoming = todaySessions.find((s) => this.toDate(s.startTime) > now) || null;
  if (upcoming) {
    return { primary: upcoming, secondary: null, messageType: null };
  }

  // --- 4️⃣ No live or upcoming sessions today ---
  // Check if there are any sessions for future days
  const futureSessions = sessions.filter((s) => {
    const normalizedDay = (s.day || '').toString().toLowerCase().replace('day ', '');
    return Number(normalizedDay) > this.currentDay;
  });

  if (futureSessions.length > 0) {
    return { primary: null, secondary: null, messageType: 'today' };
  }

  // --- 5️⃣ If this is the last day and all done ---
  return { primary: null, secondary: null, messageType: 'over' };
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

  /** Local date string 'YYYY-MM-DD' (uses user's locale timezone) */
  private toLocalDateStr(d: Date): string {
    const year = d.getFullYear();
    const mm = `${d.getMonth() + 1}`.padStart(2, '0');
    const dd = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  // Exposed for template: returns a short human readable countdown for session
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

  // Keep your original helper but it's now more reliable with timestamps
  shouldDisplaySpeaker(session: Session | undefined | null): boolean {
    if (!session?.speaker) return false;
    if (!session.speaker.name) return false;
    const speakerName = session.speaker.name.trim().toLowerCase();
    return speakerName !== 'all' && speakerName !== '';
  }

  // ---------- Announcements ----------

  private loadAnnouncements() {
    const announcementsRef = collection(this.firestore, 'announcements');
    // order by timestamp desc
    const q = query(announcementsRef, orderBy('timestamp', 'desc'));
    this.announcements$ = collectionData(q, { idField: 'id' }).pipe(
      map((ann: any[]) =>
        ann.sort((a, b) => this.toDate(b.timestamp).getTime() - this.toDate(a.timestamp).getTime())
      ),
      shareReplay(1)
    );
  }

  // ---------- Day calculation ----------

  private calculateCurrentDay() {
    // Convention starts November 10, 2025 in Dubai timezone (GMT+4)
    const conventionStart = new Date('2025-11-10T00:00:00+04:00');
    const now = new Date();

    // Convert current time to Dubai timezone (account for local tz offset)
    const dubaiOffset = 4 * 60; // minutes
    const localOffset = now.getTimezoneOffset(); // minutes
    const dubaiTime = new Date(now.getTime() + (dubaiOffset + localOffset) * 60000);

    const diffTime = dubaiTime.getTime() - conventionStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      this.currentDay = 1;
    } else if (diffDays >= 3) {
      this.currentDay = 3;
    } else {
      this.currentDay = diffDays + 1;
    }
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
}