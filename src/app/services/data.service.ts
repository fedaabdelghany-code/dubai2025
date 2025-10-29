import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  orderBy,
  query,
  CollectionReference,
  DocumentData,
} from '@angular/fire/firestore';
import { Observable, shareReplay, firstValueFrom } from 'rxjs';

export interface Session {
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

export interface Announcement {
  id: string;
  title: string;
  description: string;
  timestamp: any;
  active: boolean;
  priority: string;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  private _sessions$!: Observable<Session[]>;
  private _announcements$!: Observable<Announcement[]>;
  private _initialized = false;

  constructor(private firestore: Firestore) {}

  /** Start fetching Firestore data early */
  initData(): void {
    if (this._initialized) return;
    this._initialized = true;

    // ✅ Strongly type your collection references
    const sessionsRef = collection(
      this.firestore,
      'sessions'
    ) as CollectionReference<Session>;

    const announcementsRef = collection(
      this.firestore,
      'announcements'
    ) as CollectionReference<Announcement>;

    // ✅ Now query() inherits the correct type automatically
    this._sessions$ = collectionData(
      query(sessionsRef, orderBy('startTime', 'asc')),
      { idField: 'id' }
    ).pipe(shareReplay(1));

    this._announcements$ = collectionData(
      query(announcementsRef, orderBy('timestamp', 'desc')),
      { idField: 'id' }
    ).pipe(shareReplay(1));

    // ⚡ Prefetch (non-blocking)
    firstValueFrom(this._sessions$).catch(() => {});
    firstValueFrom(this._announcements$).catch(() => {});
  }

  /** Observable getters */
  get sessions$(): Observable<Session[]> {
    this.ensureInit();
    return this._sessions$;
  }

  get announcements$(): Observable<Announcement[]> {
    this.ensureInit();
    return this._announcements$;
  }

  private ensureInit() {
    if (!this._initialized) this.initData();
  }
}
