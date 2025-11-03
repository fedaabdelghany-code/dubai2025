import { Component, OnInit, ViewChild } from '@angular/core';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tips',
  templateUrl: './tips.page.html',
  styleUrls: ['./tips.page.scss'],
  standalone: true,
  imports: [IonIcon, IonButton, IonContent]
})
export class TipsPage implements OnInit {
  @ViewChild(IonContent, { static: true }) content!: IonContent;

  constructor(private router: Router) { }

  ngOnInit() { }

  goHome() {

   
        this.router.navigate(['tabs/home']);
    };
  }

