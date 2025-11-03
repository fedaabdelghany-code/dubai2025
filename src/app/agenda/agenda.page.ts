import { Component, OnInit, ElementRef, QueryList, ViewChildren, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonModal } from '@ionic/angular/standalone';
import { Firestore, collection, collectionData, query, where, getDocs } from '@angular/fire/firestore';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Session {
  id: string;
  title: string;
  startTime: any;
  endTime: any;
  location: string;
  day: string;
  description?: string;
  category: string;
  color: string;
  isGeneral: boolean;
  rotationalSchedule?: any;
  material?: string;
  qnaLink?: string;
  speaker?: {
    name: string;
    title: string;
    photoURL: string | null;
    userID: string;
  };
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  templateUrl: './agenda.page.html',
  styleUrls: ['./agenda.page.scss'],
  imports: [IonModal, IonContent, IonIcon, CommonModule, DatePipe, FormsModule],
})
export class AgendaPage implements OnInit {
  selectedDay = '1';
  @ViewChildren('sessionCard') sessionCards!: QueryList<ElementRef>;
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  searchQuery = '';

  currentUser: any = null;
  userEmail = 'feda.abdelghany@lafarge.com'; // TODO: replace with logged-in user's email

  showMaterialViewer = false;
  selectedMaterial: { url: string; name: string; type: string } | null = null;

  constructor(
    private firestore: Firestore,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('[DEBUG] Initializing AgendaPage...');
    this.loadUserAndSessions();
  }

  async loadUserAndSessions() {
    try {
      // 1️⃣ Load the user
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('email', '==', this.userEmail));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn(`[DEBUG] No user found with email ${this.userEmail}`);
        return;
      }

      this.currentUser = snapshot.docs[0].data();
      console.log('[DEBUG] Loaded user:', this.currentUser);

      // 2️⃣ Load all sessions
      const sessionsRef = collection(this.firestore, 'sessions');
      collectionData(sessionsRef, { idField: 'id' }).subscribe((data: any[]) => {
        this.sessions = data || [];
        console.log('[DEBUG] Total sessions loaded:', this.sessions.length);

        // 3️⃣ Apply user-specific filters
        this.applyFilters();

        // Scroll to a target session if present in URL
        this.route.queryParams.subscribe(params => {
          const targetSessionId = params['sessionId'] || null;
          if (targetSessionId) {
            setTimeout(() => this.scrollToSession(targetSessionId), 150);
          }
        });
      });
    } catch (err) {
      console.error('[DEBUG] Error loading user or sessions:', err);
    }
  }

private applyFilters() {
  if (!this.currentUser) return;

  let filtered = this.sessions.filter(s => s.day === this.selectedDay);

  filtered = filtered.filter(session => {
    if (session.isGeneral) return true;

    // Determine group key
    let groupKey = '';
    if (this.selectedDay === '2') { // day11 → agenda day 2
      const group = this.currentUser.day11?.group;
      groupKey = group ? `group${group}` : '';
    } else if (this.selectedDay === '3') { // day12 → agenda day 3
      const group = this.currentUser.day12?.groupAM; // or groupPM depending on session
      if (group && group !== 'SV') {
        groupKey = `group${group}`; // only if it's a numbered group
      }
    }

    if (!groupKey) return false; // user not assigned to a numbered group → skip
    return session.rotationalSchedule?.hasOwnProperty(groupKey);
  });

  // Map start/end times for user's group
  this.filteredSessions = filtered.map(session => {
    let groupKey = '';
    if (this.selectedDay === '2') {
      groupKey = `group${this.currentUser.day11?.group}`;
    } else if (this.selectedDay === '3') {
      const group = this.currentUser.day12?.groupAM;
      if (group && group !== 'SV') groupKey = `group${group}`;
    }

    if (groupKey && session.rotationalSchedule?.[groupKey]) {
      return {
        ...session,
        startTime: session.rotationalSchedule[groupKey].startTime,
        endTime: session.rotationalSchedule[groupKey].endTime
      };
    }
    return session;
  });

  // Sort sessions by startTime
  this.filteredSessions.sort((a, b) => {
    const aTime = a.startTime.toDate ? a.startTime.toDate().getTime() : new Date(a.startTime).getTime();
    const bTime = b.startTime.toDate ? b.startTime.toDate().getTime() : new Date(b.startTime).getTime();
    return aTime - bTime;
  });

  console.log('[DEBUG] Filtered sessions for user:', this.filteredSessions);
}

  private scrollToSession(sessionId: string | null, retries = 12) {
    if (!sessionId) return;

    const target = this.sessionCards?.find(card => card.nativeElement.id === sessionId);

    if (target && target.nativeElement) {
      const el = target.nativeElement;
      setTimeout(() => {
        const viewportHeight = window.innerHeight;
        const elementTop = el.offsetTop;
        const elementHeight = el.offsetHeight;
        const centerY = elementTop + elementHeight / 2 - viewportHeight / 2;

        this.content.scrollToPoint(0, centerY, 500).then(() => {
          el.classList.add('highlight');
          setTimeout(() => el.classList.remove('highlight'), 2200);
        });
      }, 200);

      return;
    } else if (retries > 0) {
      setTimeout(() => this.scrollToSession(sessionId, retries - 1), 250);
    }
  }

  setSelectedDay(day: string) {
    this.selectedDay = day;
    this.applyFilters();
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
    this.applyFilters();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilters();
  }

  formatSessionTime(session: Session): string {
    const start = session.startTime.toDate ? session.startTime.toDate() : new Date(session.startTime);
    const end = session.endTime.toDate ? session.endTime.toDate() : new Date(session.endTime);
    const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return `${start.toLocaleTimeString('en-US', opts)} - ${end.toLocaleTimeString('en-US', opts)}`;
  }

  // Material viewing methods...
  viewMaterial(session: Session) {
    if (!session.material) return;
    const type = this.getMaterialType(session.material);
    this.selectedMaterial = { url: session.material, name: session.title, type };
    this.showMaterialViewer = true;
  }

  closeMaterialViewer() {
    this.showMaterialViewer = false;
    this.selectedMaterial = null;
  }

  getMaterialType(url: string): string {
    const u = url.toLowerCase();
    if (u.includes('pdf')) return 'PDF';
    if (u.match(/\.(mp4|mov|webm|video)/)) return 'Video';
    if (u.match(/\.(jpg|jpeg|png|gif|image)/)) return 'Image';
    if (u.match(/\.(xls|xlsx)/)) return 'Spreadsheet';
    if (u.match(/\.(ppt|pptx)/)) return 'Presentation';
    return 'Document';
  }

  getMaterialIcon(type: string): string {
    const map: Record<string, string> = {
      PDF: 'document-text-outline',
      Document: 'document-outline',
      Image: 'image-outline',
      Spreadsheet: 'grid-outline',
      Video: 'videocam-outline',
      Presentation: 'easel-outline',
    };
    return map[type] || 'document-outline';
  }


  formatCategory(category: string): string {
    return category
      ? category.replace(/[-_]/g, ' ')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
      : '';
  }

  hasMaterial(session: Session): boolean {
    return !!session.material?.trim();
  }
}
