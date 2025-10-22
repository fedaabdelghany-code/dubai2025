import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';

import { 
  documentOutline, 
  downloadOutline, 
  businessOutline,
  locationOutline 
} from 'ionicons/icons';

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
  imports: [IonicModule, CommonModule]
})
export class ResourcesPage {
  activeSection: 'materials' | 'host' | 'company' = 'materials';

  documents: Document[] = [
    { 
      title: 'AMEA Leadership Keynote Deck', 
      date: 'Oct 7, 2025', 
      size: '4.1 MB',
      category: 'session'
    },
    { 
      title: 'ME&A Market Growth Forecast Q4',
      date: 'Oct 8, 2025', 
      size: '1.8 MB',
      category: 'session'
    },
    { 
      title: 'Regional Delegate Handbook',
      date: 'Oct 6, 2025', 
      size: '5.2 MB',
      category: 'general'
    },
    { 
      title: 'Sustainability Roadmap (AMEA)',
      date: 'Oct 8, 2025', 
      size: '3.1 MB',
      category: 'company'
    }
  ];

  hostCityInfo: HostInfo[] = [
    {
      icon: '🏛️',
      title: 'Venue & Facilities Guide',
      description: 'Your guide to the conference center and on-site amenities',
      action: 'View Map'
    },
    {
      icon: '💡',
      title: 'Local Business Etiquette',
      description: 'Quick tips on cultural norms and business communication in the UAE',
      action: 'Read Guide'
    },
    {
      icon: '🍽️',
      title: 'Top Culinary Experiences',
      description: 'Explore the best Emirati, Arabic, and international dining in Dubai',
      action: 'Explore'
    },
    {
      icon: '🚕',
      title: 'Transportation & Safety',
      description: 'Official conference transport options and essential safety contacts',
      action: 'View Guide'
    },
    {
      icon: '🐪',
      title: 'Cultural Highlights',
      description: 'Desert safaris, cultural centers, and local excursions',
      action: 'Discover'
    },
    {
      icon: '📞',
      title: 'Emergency Contact List', 
      description: 'Direct numbers for medical, security, and conference support',
      action: 'Call Now'
    }
  ];

  companyInfo: CompanyInfo[] = [
    {
      icon: '📈',
      title: 'AMEA Market Performance',
      description: 'Latest financial highlights and regional growth drivers for Holcim'
    },
    {
      icon: '🌐',
      title: 'Regional Leadership Team',
      description: 'Meet the AMEA Executive Committee and their areas of focus'
    },
    {
      icon: '🏗️',
      title: 'Flagship AMEA Projects',
      description: 'Showcasing key construction and sustainability projects across the region'
    },
    {
      icon: '♻️',
      title: 'Green Building Solutions',
      description: 'Our ECOPact and ECOPlanet product deployment and impact in the AMEA region'
    },
    {
      icon: '🔒',
      title: 'Compliance & Ethics',
      description: 'Regional policies and resources for maintaining ethical business conduct'
    }
  ];

  constructor() {
    // Register icons
    addIcons({
      'document-outline': documentOutline,
      'download-outline': downloadOutline,
      'business-outline': businessOutline,
      'location-outline': locationOutline
    });
  }

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