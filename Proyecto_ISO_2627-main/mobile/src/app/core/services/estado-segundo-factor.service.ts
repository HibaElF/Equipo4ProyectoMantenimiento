import { Injectable, signal } from '@angular/core';

const CLAVE_DESCARTE = 'esibuy.avisoSegundoFactorDescartado';

/**
 * T-27: lo que hace falta para el aviso «Protege tu cuenta» (igual que en la web).
 * - activado: si el cliente tiene el segundo factor (null = todavía no se sabe). Lo actualizan el aviso al
 *   consultar el perfil y la pantalla de Seguridad al activarlo o desactivarlo, para que el aviso desaparezca.
 * - descartado: «Ahora no» oculta el aviso hasta que se cierre la app o la sesión (sessionStorage, sin datos personales).
 */
@Injectable({ providedIn: 'root' })
export class EstadoSegundoFactorService {
  readonly activado = signal<boolean | null>(null);
  readonly descartado = signal(leerDescarte());

  descartar(): void {
    this.descartado.set(true);
    try {
      sessionStorage.setItem(CLAVE_DESCARTE, '1');
    } catch {
      // Sin almacenamiento, el aviso reaparecerá la próxima vez.
    }
  }

  /** Al cerrar sesión, otro usuario debe volver a ver el aviso. */
  reiniciar(): void {
    this.activado.set(null);
    this.descartado.set(false);
    try {
      sessionStorage.removeItem(CLAVE_DESCARTE);
    } catch {
      // Nada que limpiar.
    }
  }
}

function leerDescarte(): boolean {
  try {
    return sessionStorage.getItem(CLAVE_DESCARTE) === '1';
  } catch {
    return false;
  }
}
