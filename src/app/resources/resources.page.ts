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
      title: 'AMEA Leadership Keynote Deck', 
      date: 'Oct 7, 2025', 
      size: '4.1 MB', // Slightly larger file for a main deck
      category: 'session'
    },
    { 
      title: 'ME&A Market Growth Forecast Q4', // Specific to Middle East & Africa
      date: 'Oct 8, 2025', 
      size: '1.8 MB',
      category: 'session'
    },
    { 
      title: 'Regional Delegate Handbook', // Renamed for relevance
      date: 'Oct 6, 2025', 
      size: '5.2 MB',
      category: 'general'
    },
    { 
      title: 'Sustainability Roadmap (AMEA)', // Explicitly AMEA
      date: 'Oct 8, 2025', 
      size: '3.1 MB',
      category: 'company' // Changed category
    }
  ];

  hostCityInfo: HostInfo[] = [
    {
      icon: '🏛️', // More cultural icon
      title: 'Venue & Facilities Guide', // Renamed for more practical use
      description: 'Your guide to the conference center and on-site amenities',
      action: 'View Map'
    },
    {
      icon: '💡', // New info card
      title: 'Local Business Etiquette', // Very relevant for the AMEA region
      description: 'Quick tips on cultural norms and business communication in the UAE',
      action: 'Read Guide'
    },
    {
      icon: '🍽️',
      title: 'Top Culinary Experiences', // Focused on experience
      description: 'Explore the best Emirati, Arabic, and international dining in Dubai',
      action: 'Explore'
    },
    {
      icon: '🚕',
      title: 'Transportation & Safety', // Added safety
      description: 'Official conference transport options and essential safety contacts',
      action: 'View Guide'
    },
    {
      icon: '🐪', // Unique local icon
      title: 'Cultural Highlights', // Focused on culture
      description: 'Desert safaris, cultural centers, and local excursions',
      action: 'Discover'
    },
    {
      icon: '📞', // New info card
      title: 'Emergency Contact List', 
      description: 'Direct numbers for medical, security, and conference support',
      action: 'Call Now'
    }
  ];

  companyInfo: CompanyInfo[] = [
    {
      icon: '📈', // More business-focused icon
      title: 'AMEA Market Performance',
      description: 'Latest financial highlights and regional growth drivers for Holcim'
    },
    {
      icon: '🌐', // Icon for global/regional
      title: 'Regional Leadership Team',
      description: 'Meet the AMEA Executive Committee and their areas of focus'
    },
    {
      icon: '🏗️',
      title: 'Flagship AMEA Projects', // Specific to regional impact
      description: 'Showcasing key construction and sustainability projects across the region'
    },
    {
      icon: '♻️',
      title: 'Green Building Solutions',
      description: 'Our ECOPact and ECOPlanet product deployment and impact in the AMEA region'
    },
    
    {
      icon: '🔒', // Added a security/compliance-related card
      title: 'Compliance & Ethics',
      description: 'Regional policies and resources for maintaining ethical business conduct'
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