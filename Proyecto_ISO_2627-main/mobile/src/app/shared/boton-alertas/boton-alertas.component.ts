import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';
import { textoContador } from '../../core/models/alerta';
import { AlertasEstadoService } from '../../core/services/alertas-estado.service';

/**
 * Campana de la cabecera de las pantallas principales (como «Alertas» en la cabecera de la web),
 * con el número de alertas sin leer. Abre «Mis alertas».
 */
@Component({
  selector: 'app-boton-alertas',
  imports: [RouterLink, IonIcon],
  template: `
    <a class="campana" routerLink="/alertas" [attr.aria-label]="etiqueta()">
      <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
      @if (noLeidas() > 0) {
        <span class="contador" aria-hidden="true">{{ texto() }}</span>
      }
    </a>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .campana {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      color: inherit;
      text-decoration: none;
    }
    .campana:focus-visible {
      outline: 3px solid #ffffff;
      outline-offset: -4px;
    }
    .campana:active {
      background: rgba(255, 255, 255, 0.15);
    }
    ion-icon {
      font-size: 26px;
    }
    .contador {
      position: absolute;
      top: 6px;
      left: 26px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      border: 2px solid var(--ion-color-primary);
      background: var(--ion-color-danger);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      line-height: 14px;
      text-align: center;
      box-sizing: content-box;
    }
  `
})
export class BotonAlertasComponent {
  readonly noLeidas = inject(AlertasEstadoService).noLeidas;
  readonly texto = computed(() => textoContador(this.noLeidas()));

  /** Lo que lee el lector de pantalla: «Alertas» o «Alertas, 3 sin leer». */
  readonly etiqueta = computed(() => {
    const n = this.noLeidas();
    return n > 0 ? `Alertas, ${n} sin leer` : 'Alertas';
  });

  constructor() {
    addIcons({ notificationsOutline });
  }
}
