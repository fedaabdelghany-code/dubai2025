import { Component } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

interface Document {
  title: string;
  date: string;
  size: string;
  category: 'session' | 'company' | 'general';
}

interface HostInfo {
  icon: string;
  title: string;
  description: string;
  action?: string;
}

interface CompanyInfo {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-resources',
  standalone: true,
  templateUrl: 'resources.page.html',
  styleUrls: ['resources.page.scss'],
  imports: [IonContent, IonIcon, CommonModule]
})
export class ResourcesPage {
  activeSection: 'materials' | 'host' | 'company' = 'materials';

  documents: Document[] = [
    { 
      title: 'Opening Keynote Slides', 
      date: 'Oct 7, 2025', 
      size: '2.4 MB',
      category: 'session'
    },
    { 
      title: 'Growth Strategy Document', 
      date: 'Oct 8, 2025', 
      size: '1.8 MB',
      category: 'session'
    },
    { 
      title: 'Conference Handbook', 
      date: 'Oct 6, 2025', 
      size: '5.2 MB',
      category: 'general'
    },
    { 
      title: 'Innovation Workshop Materials', 
      date: 'Oct 8, 2025', 
      size: '3.1 MB',
      category: 'session'
    }
  ];

  hostCityInfo: HostInfo[] = [
    {
      icon: '🏙️',
      title: 'About Dubai',
      description: 'A global hub of innovation, culture, and business excellence',
      action: 'Learn More'
    },
    {
      icon: '🏨',
      title: 'Hotel Information',
      description: 'Conference venue and recommended accommodations',
      action: 'View Details'
    },
    {
      icon: '🍽️',
      title: 'Dining Recommendations',
      description: 'Top restaurants and local cuisine near the venue',
      action: 'Explore'
    },
    {
      icon: '🚕',
      title: 'Transportation',
      description: 'Getting around Dubai - Metro, taxis, and ride-sharing',
      action: 'View Guide'
    },
    {
      icon: '🎭',
      title: 'Things to Do',
      description: 'Must-see attractions and cultural experiences',
      action: 'Discover'
    },
    {
      icon: '🌡️',
      title: 'Weather & Climate',
      description: 'October average: 28°C (82°F) - Perfect conference weather',
      action: 'Forecast'
    }
  ];

  companyInfo: CompanyInfo[] = [
    {
      icon: '🏢',
      title: 'Holcim EMEA Operations',
      description: 'Overview of our Europe, Middle East, and Africa operations and strategic initiatives'
    },
    {
      icon: '🌍',
      title: 'Regional Offices',
      description: 'Holcim presence across 20+ EMEA countries with 50+ offices and production facilities'
    },
    {
      icon: '🏗️',
      title: 'Construction Solutions',
      description: 'Innovative building materials and sustainable construction solutions for EMEA'
    },
    {
      icon: '♻️',
      title: 'Sustainability Goals',
      description: 'Our commitment to net-zero carbon emissions and circular economy practices'
    },
   
    {
      icon: '📱',
      title: 'Contact Directory',
      description: 'Key contacts and regional leadership team information'
    }
  ];

  constructor() {}

  setActiveSection(section: 'materials' | 'host' | 'company') {
    this.activeSection = section;
  }

  downloadDocument(doc: Document) {
    console.log('Downloading:', doc.title);
    // Implement download logic
  }

  openHostInfo(info: HostInfo) {
    console.log('Opening:', info.title);
    // Implement navigation logic
  }

  openCompanyInfo(info: CompanyInfo) {
    console.log('Opening:', info.title);
    // Implement navigation logic
  }
}