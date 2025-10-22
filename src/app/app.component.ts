import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, AlertController } from '@ionic/angular/standalone';
import { PwaService } from './services/pwa.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(
    private pwaService: PwaService,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    // Show install prompt after a delay
    setTimeout(() => {
      this.showInstallPrompt();
    }, 5000);
  }

  async showInstallPrompt() {
    if (this.pwaService.canInstall()) {
      const alert = await this.alertController.create({
        header: 'Install App',
        message: 'Install this app on your device for a better experience!',
        buttons: [
          {
            text: 'Not Now',
            role: 'cancel'
          },
          {
            text: 'Install',
            handler: () => {
              this.pwaService.promptInstall();
            }
          }
        ]
      });

      await alert.present();
    }
  }
}