/*
 * T-27: el aviso para activar el segundo factor se puede descartar y no vuelve a salir en esta pestaña.
 * Se guarda en sessionStorage (como marca-sesion.ts); si el almacenamiento no está disponible, el aviso
 * simplemente vuelve a aparecer. No guarda datos personales.
 */

const CLAVE = 'esibuy.avisoSegundoFactorDescartado';

export function avisoDescartado(): boolean {
  try {
    return sessionStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function descartarAviso(): void {
  try {
    sessionStorage.setItem(CLAVE, '1');
  } catch {
    // Sin almacenamiento, el aviso reaparecerá en la siguiente pantalla.
  }
}

// Al cerrar la sesión, otro usuario que entre en la misma pestaña debe volver a ver el aviso.
export function olvidarDescarte(): void {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // Nada que limpiar.
  }
}
