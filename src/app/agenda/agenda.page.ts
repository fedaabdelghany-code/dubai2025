import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonContent, IonIcon, IonModal } from '@ionic/angular/standalone';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Material {
  id: string;
  name: string;
  type: 'PDF' | 'Document' | 'Image' | 'Spreadsheet';
  size: string;
  url: string;
}

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
  materials?: Material[];
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
  imports: [IonModal, IonContent, IonIcon, CommonModule, DatePipe],
  templateUrl: './agenda.page.html',
  styleUrls: ['./agenda.page.scss'],
})
export class AgendaPage implements OnInit {
  selectedDay: string = '1';
  sessions: Session[] = [];
  
  showMaterialViewer = false;
  selectedMaterial: Material | null = null;

  constructor(
    private firestore: Firestore,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.loadSessions();
  }

  private loadSessions() {
    const sessionsRef = collection(this.firestore, 'sessions');
    collectionData(sessionsRef, { idField: 'id' }).subscribe((data: any[]) => {
      this.sessions = data;
    });
  }

  setSelectedDay(day: string) {
    this.selectedDay = day;
  }

  getFilteredSessions(): Session[] {
    return this.sessions
      .filter((s) => s.day === this.selectedDay)
      .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime());
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

  getMaterialIcon(type: string): string {
    const icons: Record<string, string> = {
      'PDF': 'document-text-outline',
      'Document': 'document-outline',
      'Image': 'image-outline',
      'Spreadsheet': 'grid-outline',
    };
    return icons[type] || 'document-outline';
  }

  viewMaterial(material: Material) {
    this.selectedMaterial = material;
    this.showMaterialViewer = true;
  }

  downloadMaterial(event: Event, material: Material) {
    event.stopPropagation();
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = material.url;
    link.download = material.name;
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
}