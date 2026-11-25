import { Component, computed, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { star, starHalf, starOutline } from 'ionicons/icons';

/** Puntuación de 0 a 5 con estrellas (medias incluidas). Los lectores de pantalla oyen «4,5 de 5». */
@Component({
  selector: 'app-estrellas',
  imports: [IonIcon],
  template: `
    <span class="estrellas" role="img" [attr.aria-label]="etiqueta()">
      @for (icono of iconos(); track $index) {
        <ion-icon [name]="icono" aria-hidden="true"></ion-icon>
      }
    </span>
  `,
  styles: `
    .estrellas {
      display: inline-flex;
      gap: 1px;
      color: #c98a1b;
      vertical-align: middle;
    }
  `
})
export class EstrellasComponent {
  readonly valor = input.required<number>();

  readonly iconos = computed(() => {
    const v = Math.max(0, Math.min(5, Math.round(this.valor() * 2) / 2));
    return [1, 2, 3, 4, 5].map((i) => (v >= i ? 'star' : v >= i - 0.5 ? 'star-half' : 'star-outline'));
  });

  readonly etiqueta = computed(
    () => `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(this.valor())} de 5`
  );

  constructor() {
    addIcons({ star, starHalf, starOutline });
  }
}
