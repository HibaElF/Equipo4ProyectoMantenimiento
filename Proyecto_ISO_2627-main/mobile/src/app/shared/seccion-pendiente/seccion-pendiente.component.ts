import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { constructOutline } from 'ionicons/icons';

/** Aviso provisional para las secciones que aún no están hechas. */
@Component({
  selector: 'app-seccion-pendiente',
  imports: [IonIcon],
  template: `
    <div class="pendiente" role="status">
      <ion-icon name="construct-outline" aria-hidden="true"></ion-icon>
      <p><strong>{{ titulo() }}</strong></p>
      <p>Esta sección estará disponible muy pronto.</p>
    </div>
  `,
  styles: `
    .pendiente {
      text-align: center;
      padding: 48px 16px;
      color: var(--ion-color-medium);
    }
    ion-icon {
      font-size: 48px;
      color: var(--ion-color-primary);
    }
  `
})
export class SeccionPendienteComponent {
  readonly titulo = input.required<string>();
  constructor() {
    addIcons({ constructOutline });
  }
}
