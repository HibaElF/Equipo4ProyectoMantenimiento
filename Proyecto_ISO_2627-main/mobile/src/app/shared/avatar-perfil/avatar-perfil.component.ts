import { Component, computed, input, signal } from '@angular/core';
import { inicialPerfil } from '../../core/models/perfil';

/** Foto de perfil; si no hay o no carga, la inicial del nombre (como la web). */
@Component({
  selector: 'app-avatar-perfil',
  template: `
    @if (imagen() && !fallo()) {
      <img [src]="imagen()" alt="" [style.width.px]="tamano()" [style.height.px]="tamano()" (error)="fallo.set(true)" (load)="fallo.set(false)" />
    } @else {
      <span class="inicial" aria-hidden="true" [style.width.px]="tamano()" [style.height.px]="tamano()" [style.font-size.px]="tamano() * 0.42">
        {{ inicial() }}
      </span>
    }
  `,
  styles: `
    :host { display: inline-flex; }
    img, .inicial { border-radius: 50%; border: 3px solid var(--ion-color-primary); background: #ffffff; }
    img { object-fit: cover; }
    .inicial {
      display: flex; align-items: center; justify-content: center;
      background: #e8f2ed; color: var(--ion-color-primary);
      font-family: 'Playfair Display', serif; font-weight: 700;
    }
  `
})
export class AvatarPerfilComponent {
  readonly imagen = input<string | null>(null);
  readonly nombre = input<string>('');
  readonly tamano = input(88);

  readonly fallo = signal(false);
  readonly inicial = computed(() => inicialPerfil(this.nombre()) || '?');
}
