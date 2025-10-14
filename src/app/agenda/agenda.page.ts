import { Component } from '@angular/core';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

interface Session {
  time: string;
  title: string;
  speaker: string;
  room: string;
  type: string;
  color: string;
  inAgenda: boolean;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  templateUrl: 'agenda.page.html',
  styleUrls: ['agenda.page.scss'],
  imports: [IonContent, IonIcon, CommonModule]
})
export class AgendaPage {
  agendaView: 'my' | 'full' = 'my';
  selectedDay = 2;

  sessions: Session[] = [
    { 
      time: '09:00 - 10:00', 
      title: 'Opening Keynote', 
      speaker: 'Dr. James Wilson', 
      room: 'Hall A', 
      type: 'Keynote', 
      color: '#94C12E', 
      inAgenda: true 
    },
    { 
      time: '10:00 - 11:30', 
      title: 'Regional Growth Strategies', 
      speaker: 'Sarah Chen', 
      room: 'Hall A', 
      type: 'Session', 
      color: '#00A9E0', 
      inAgenda: true 
    },
    { 
      time: '11:45 - 13:00', 
      title: 'Innovation Workshop', 
      speaker: 'Multiple Speakers', 
      room: 'Room 3', 
      type: 'Workshop', 
      color: '#1D4370', 
      inAgenda: false 
    },
    { 
      time: '14:00 - 15:30', 
      title: 'Market Analysis Deep Dive', 
      speaker: 'Alex Kumar', 
      room: 'Hall B', 
      type: 'Breakout', 
      color: '#00A9E0', 
      inAgenda: true 
    }
  ];

  constructor() {}

  setAgendaView(view: 'my' | 'full') {
    this.agendaView = view;
  }

  setSelectedDay(day: number) {
    this.selectedDay = day;
  }

  getFilteredSessions(): Session[] {
    if (this.agendaView === 'full') {
      return this.sessions;
    }
    return this.sessions.filter(session => session.inAgenda);
  }

  toggleAgenda(session: Session) {
    session.inAgenda = !session.inAgenda;
  }

  downloadMaterial(session: Session) {
    console.log('Downloading material for:', session.title);
  }
}