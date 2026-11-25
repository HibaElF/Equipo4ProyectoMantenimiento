/*
 * Mismas reglas que el backend (ValidadorMetodoPago), para avisar antes de enviar.
 * El backend vuelve a validarlo todo.
 */

/** Algoritmo de Luhn: detecta números de tarjeta mal escritos. */
export function cumpleLuhn(numero: string): boolean {
  let suma = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let d = Number(numero[i]);
    if (doble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
    doble = !doble;
  }
  return suma % 10 === 0;
}

export function errorNumeroTarjeta(valor: string): string {
  const numero = valor.replace(/[\s-]/g, '');
  if (!numero) return 'El número de tarjeta es obligatorio.';
  if (!/^\d{13,19}$/.test(numero) || !cumpleLuhn(numero)) return 'El número de tarjeta no es válido.';
  return '';
}

export function errorTitular(valor: string): string {
  const t = valor.trim();
  if (!t) return 'El titular es obligatorio.';
  if (t.length < 2 || t.length > 80 || !/^[\p{L}][\p{L} .'-]*$/u.test(t)) {
    return 'El titular contiene caracteres no permitidos o su longitud no es válida.';
  }
  return '';
}

export function errorCaducidad(valor: string, hoy = new Date()): string {
  const t = valor.trim();
  if (!t) return 'La caducidad es obligatoria.';
  const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(t);
  if (!m) return 'La caducidad debe tener el formato MM/AA.';
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (anio < hoy.getFullYear() || (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)) {
    return 'La tarjeta está caducada.';
  }
  return '';
}

export function errorCvv(valor: string): string {
  const t = valor.trim();
  if (!t) return 'El código de seguridad es obligatorio.';
  if (!/^\d{3,4}$/.test(t)) return 'El código de seguridad debe tener 3 o 4 dígitos.';
  return '';
}

export function errorCorreoPaypal(valor: string): string {
  const c = valor.trim().toLowerCase();
  if (!c) return 'El correo de PayPal es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) || c.length > 254) return 'El correo de PayPal no es válido.';
  return '';
}

export function errorTelefonoBizum(valor: string): string {
  let t = valor.replace(/\s/g, '');
  if (t.startsWith('+34')) t = t.slice(3);
  if (!t) return 'El teléfono de Bizum es obligatorio.';
  if (!/^[67]\d{8}$/.test(t)) return 'El teléfono de Bizum no es válido.';
  return '';
}

/** «1234567812345678» → «1234 5678 1234 5678» mientras se escribe. */
export function formatearNumeroTarjeta(valor: string): string {
  return valor
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

/** «1228» → «12/28» mientras se escribe. */
export function formatearCaducidad(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
