import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonModal } from '@ionic/angular/standalone';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ElementRef, ViewChildren, QueryList } from '@angular/core';
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
  material?: string; // URL of the material (PDF, video, image, etc.)
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
  imports: [IonModal, IonContent, IonIcon, CommonModule, DatePipe, FormsModule],
  templateUrl: './agenda.page.html',
  styleUrls: ['./agenda.page.scss'],
})
export class AgendaPage implements OnInit {
  selectedDay: string = '1';
  @ViewChildren('sessionCard') sessionCards!: QueryList<ElementRef>;
  private targetSessionId: string | null = null;
  sessions: Session[] = [];  
  filteredSessions: Session[] = [];
  showMaterialViewer = false;
  selectedMaterial: { url: string; name: string; type: string } | null = null;
  searchQuery: string = '';

  constructor(
    private firestore: Firestore,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Subscribe to query params and react every time they change
    this.route.queryParams.subscribe((params) => {
      // Normalize day param if present (strip "Day " if passed)
      if (params['day']) {
        // if the day param might be passed as "Day 1" or "1", normalize to "1"
        this.selectedDay = String(params['day']).replace(/^Day\s*/i, '');
      }

      // Always take sessionId (could be null)
      this.targetSessionId = params['sessionId'] || null;

      // If sessions are already loaded, reapply filters and attempt to scroll.
      // Otherwise loadSessions will handle it once sessions arrive.
      if (this.sessions && this.sessions.length > 0) {
        // If we got a targetSessionId, try to set the day to its session day (safeguard)
        if (this.targetSessionId) {
          const target = this.sessions.find(s => s.id === this.targetSessionId);
          if (target) {
            this.selectedDay = String(target.day).replace(/^Day\s*/i, '');
          }
        }

        this.applyFilters();
        // attempt scroll (wait for DOM if necessary)
        this.waitAndScrollToSessionIfNeeded(this.targetSessionId);
      } else {
        // sessions not loaded yet — load them (this also triggers scroll once loaded)
        this.loadSessions();
      }
    });
  }

  ngAfterViewInit() {
    // When the list of session cards changes (day switch, new data), try scrolling if we have a target
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

      // If we have a target session, ensure we show its day (safety)
      if (this.targetSessionId) {
        const targetSession = this.sessions.find((s) => s.id === this.targetSessionId);
        if (targetSession) {
          this.selectedDay = String(targetSession.day).replace(/^Day\s*/i, '');
        }
      }

      this.applyFilters();

      // Attempt scroll after a short delay — but also rely on sessionCards.changes subscription
      setTimeout(() => {
        if (this.targetSessionId) {
          this.waitAndScrollToSessionIfNeeded(this.targetSessionId);
        }
      }, 150);
    });
  }

  // New helper: retries until the DOM has the element (or until retries exhausted)
  private waitAndScrollToSessionIfNeeded(sessionId: string | null, retries = 12) {
    if (!sessionId) return;
    const target = this.sessionCards?.find(card => card.nativeElement.id === sessionId);

    if (target && target.nativeElement) {
      // Scroll & highlight
      target.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.nativeElement.classList.add('highlight');
      setTimeout(() => target.nativeElement.classList.remove('highlight'), 2200);

      // Once we've scrolled to it, clear targetSessionId so we don't repeatedly scroll
      // (optional — keep it if you want repeatable behavior)
      this.targetSessionId = null;
    } else if (retries > 0) {
      // Retry after a short delay; this handles caching/render delays
      setTimeout(() => this.waitAndScrollToSessionIfNeeded(sessionId, retries - 1), 200);
    }
  }

  setSelectedDay(day: string) {
    // Called by UI day buttons — ensure filtering and clear session target (since user explicitly changed day)
    this.selectedDay = day;
    this.applyFilters();
    // Clear any pending scroll-to-target because user manually changed day
    this.targetSessionId = null;
  }



  onSearchChange(query: string) {
    this.searchQuery = query;
    this.applyFilters(); // Reapply filters when search changes
  }

  clearSearch() {
    this.searchQuery = '';
    this.applyFilters();
  }

  private applyFilters() {
    let filtered = this.sessions;

    // Filter by selected day
    filtered = filtered.filter((s) => s.day === this.selectedDay);

    // Filter by search query
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((session) => {
        return (
          // Search in title
          session.title?.toLowerCase().includes(query) ||
          // Search in location
          session.location?.toLowerCase().includes(query) ||
          // Search in category
          session.category?.toLowerCase().includes(query) ||
          // Search in description
          session.description?.toLowerCase().includes(query) ||
          // Search in speaker name
          session.speaker?.name?.toLowerCase().includes(query) ||
          // Search in speaker title
          session.speaker?.title?.toLowerCase().includes(query)
        );
      });
    }

    // Sort by start time
    this.filteredSessions = filtered.sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime()
    );
  }

  getFilteredSessions(): Session[] {
    return this.filteredSessions;
  }

  formatSessionTime(session: Session): string {
    const start = session.startTime.toDate();
    const end = session.endTime.toDate();
    const options: Intl.DateTimeFormatOptions = { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    return `${start.toLocaleTimeString('en-US', options)} - ${end.toLocaleTimeString('en-US', options)}`;
  }

  // Detect material type from URL
  getMaterialType(url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.pdf') || urlLower.includes('pdf')) return 'PDF';
    if (urlLower.includes('.mp4') || urlLower.includes('.webm') || urlLower.includes('.mov') || urlLower.includes('video')) return 'Video';
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg') || urlLower.includes('.png') || urlLower.includes('.gif') || urlLower.includes('image')) return 'Image';
    if (urlLower.includes('.doc') || urlLower.includes('.docx')) return 'Document';
    if (urlLower.includes('.xls') || urlLower.includes('.xlsx')) return 'Spreadsheet';
    if (urlLower.includes('.ppt') || urlLower.includes('.pptx')) return 'Presentation';
    return 'Document';
  }

  getMaterialIcon(type: string): string {
    const icons: Record<string, string> = {
      'PDF': 'document-text-outline',
      'Document': 'document-outline',
      'Image': 'image-outline',
      'Spreadsheet': 'grid-outline',
      'Video': 'videocam-outline',
      'Presentation': 'easel-outline',
    };
    return icons[type] || 'document-outline';
  }

  viewMaterial(session: Session) {
    if (!session.material) return;
    
    const type = this.getMaterialType(session.material);
    this.selectedMaterial = {
      url: session.material,
      name: session.title,
      type: type
    };
    this.showMaterialViewer = true;
  }

  downloadMaterial(event: Event, session: Session) {
    event.stopPropagation();
    if (!session.material) return;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = session.material;
    link.download = session.title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadCurrentMaterial() {
    if (this.selectedMaterial) {
      const link = document.createElement('a');
      link.href = this.selectedMaterial.url;
      link.download = this.selectedMaterial.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  closeMaterialViewer() {
    this.showMaterialViewer = false;
    this.selectedMaterial = null;
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  encodeURIComponent(url: string): string {
    return encodeURIComponent(url);
  }

  formatCategory(category: string): string {
    if (!category) return '';
    
    // Replace dashes and underscores with spaces, then capitalize each word
    return category
      .replace(/[-_]/g, ' ')  // Replace dashes and underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Check if session has material
  hasMaterial(session: Session): boolean {
    return !!session.material && session.material.trim() !== '';
  }
}