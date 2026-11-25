import { Component, inject } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  templateUrl: './app.html'
})
export class App {
  constructor() {
    /*
     * Ionic oculta la pantalla anterior con aria-hidden al navegar. Si el elemento pulsado
     * conserva el foco, el navegador avisa (accesibilidad). Se quita el foco al empezar a navegar.
     */
    inject(Router)
      .events.pipe(filter((e) => e instanceof NavigationStart))
      .subscribe(() => (document.activeElement as HTMLElement | null)?.blur?.());
  }
}
