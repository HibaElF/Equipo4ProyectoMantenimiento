import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/** Mismo texto que la política de privacidad de la web (T-24). Si cambia allí, hay que cambiarlo aquí. */
@Component({
  selector: 'app-politica-privacidad',
  imports: [RouterLink, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: './politica-privacidad.page.html',
  styleUrl: './legal.page.css'
})
export class PoliticaPrivacidadPage {
  readonly version = '1.0';
}
