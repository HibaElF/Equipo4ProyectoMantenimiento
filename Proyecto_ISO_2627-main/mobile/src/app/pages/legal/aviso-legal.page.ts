import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

/** Mismo texto que el aviso legal de la web (T-24). Si cambia allí, hay que cambiarlo aquí. */
@Component({
  selector: 'app-aviso-legal',
  imports: [RouterLink, IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  templateUrl: './aviso-legal.page.html',
  styleUrl: './legal.page.css'
})
export class AvisoLegalPage {}
