import { Component, OnInit, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonModal } from '@ionic/angular/standalone';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
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
  material?: string;
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
goToLocation(arg0: string) {
throw new Error('Method not implemented.');
}
goToSpeaker(arg0: { name: string; title: string; photoURL: string|null; userID: string; }|undefined) {
throw new Error('Method not implemented.');
}
  selectedDay = '1';
  @ViewChildren('sessionCard') sessionCards!: QueryList<ElementRef>;
  private targetSessionId: string | null = null;
  private fromHome = false;

  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  searchQuery = '';

  showMaterialViewer = false;
  selectedMaterial: { url: string; name: string; type: string } | null = null;

  constructor(
    private firestore: Firestore,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ionViewWillEnter() {
    // detect if user came from home
    const nav = this.router.getCurrentNavigation();
    this.fromHome = nav?.extras?.state?.['fromHome'] === true;
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.targetSessionId = params['sessionId'] || null;

      // only change day from params if no targetSession
      if (params['day'] && !this.targetSessionId) {
        this.selectedDay = params['day'].replace('Day ', '');
      }

      this.loadSessions();

      // Cleanup URL **after** scroll if not from home
      if (!this.fromHome && this.router.url.includes('?')) {
        const baseUrl = this.router.url.split('?')[0];
        setTimeout(() => {
          this.router.navigate([baseUrl], { replaceUrl: true });
        }, 600); // delay allows scroll to finish first
      }
    });
  }

  ngAfterViewInit() {
    this.sessionCards.changes.subscribe(() => {
      if (this.targetSessionId) {
        this.waitAndScrollToSessionIfNeeded(this.targetSessionId);
      }
    });
  }

  private loadSessions() {
    const sessionsRef = collection(this.firestore, 'sessions');
    collectionData(sessionsRef, { idField: 'id' }).subscribe((data: any[]) => {
      this.sessions = data || [];

      if (this.targetSessionId) {
        const target = this.sessions.find((s) => s.id === this.targetSessionId);
        if (target) {
          this.selectedDay = String(target.day).replace(/^Day\s*/i, '');
        }
      }

      this.applyFilters();

      setTimeout(() => {
        if (this.targetSessionId) {
          this.waitAndScrollToSessionIfNeeded(this.targetSessionId);
        }
      }, 150);
    });
  }

  private waitAndScrollToSessionIfNeeded(sessionId: string | null, retries = 12) {
    if (!sessionId) return;
    const target = this.sessionCards?.find(
      (card) => card.nativeElement.id === sessionId
    );

    if (target && target.nativeElement) {
      target.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.nativeElement.classList.add('highlight');
      setTimeout(() => target.nativeElement.classList.remove('highlight'), 2200);
      this.targetSessionId = null;
    } else if (retries > 0) {
      setTimeout(() => this.waitAndScrollToSessionIfNeeded(sessionId, retries - 1), 200);
    }
  }

  setSelectedDay(day: string) {
    this.selectedDay = day;
    this.applyFilters();
    this.targetSessionId = null;
  }

  onSearchChange(query: string) {
    this.searchQuery = query;
    this.applyFilters();
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = this.sessions.filter((s) => s.day === this.selectedDay);

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((session) =>
        [session.title, session.location, session.category, session.description, session.speaker?.name, session.speaker?.title]
          .some((field) => field?.toLowerCase().includes(query))
      );
    }

    this.filteredSessions = filtered.sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
    );
  }

  formatSessionTime(session: Session): string {
    const start = session.startTime.toDate();
    const end = session.endTime.toDate();
    const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return `${start.toLocaleTimeString('en-US', opts)} - ${end.toLocaleTimeString('en-US', opts)}`;
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

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }



  downloadMaterial(event: Event, session: Session) {
    event.stopPropagation();
    if (!session.material) return;
    const link = document.createElement('a');
    link.href = session.material;
    link.download = session.title;
    link.target = '_blank';
    link.click();
  }

  downloadCurrentMaterial() {
    if (!this.selectedMaterial) return;
    const link = document.createElement('a');
    link.href = this.selectedMaterial.url;
    link.download = this.selectedMaterial.name;
    link.target = '_blank';
    link.click();
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
