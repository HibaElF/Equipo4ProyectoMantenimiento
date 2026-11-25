import { Injectable, signal } from '@angular/core';

// T-27: estado conocido del segundo factor (TOTP) del usuario. Lo actualiza el aviso al consultar el perfil y
// la pantalla del perfil al activarlo o desactivarlo, para que el aviso desaparezca sin recargar.
// null = todavía no se sabe.
@Injectable({ providedIn: 'root' })
export class EstadoSegundoFactor {
  readonly activado = signal<boolean | null>(null);
}
