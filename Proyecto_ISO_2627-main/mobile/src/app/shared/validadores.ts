import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Requisitos de contraseña del backend (los mismos que muestra la web). */
export const REQUISITOS_CONTRASENA = [
  { texto: '8 caracteres como mínimo', cumple: (v: string) => Array.from(v).length >= 8 },
  { texto: 'Una letra mayúscula', cumple: (v: string) => /\p{Lu}/u.test(v) },
  { texto: 'Una letra minúscula', cumple: (v: string) => /\p{Ll}/u.test(v) },
  { texto: 'Un número', cumple: (v: string) => /\p{Nd}/u.test(v) },
  { texto: 'Un símbolo (@, #, $…), sin contar espacios', cumple: (v: string) => /[^\p{L}\p{N}\s]/u.test(v) }
] as const;

export function estadoRequisitos(valor: string): { texto: string; cumplido: boolean }[] {
  return REQUISITOS_CONTRASENA.map((r) => ({ texto: r.texto, cumplido: r.cumple(valor ?? '') }));
}

export const contrasenaSeguraValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor = typeof control.value === 'string' ? control.value : '';
  return REQUISITOS_CONTRASENA.every((r) => r.cumple(valor)) ? null : { contrasenaDebil: true };
};

/** Comprueba que los dos campos de contraseña del grupo coinciden. */
export function coincidenValidator(campo: string, repeticion: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const a = grupo.get(campo)?.value;
    const b = grupo.get(repeticion)?.value;
    return !b || a === b ? null : { noCoinciden: true };
  };
}

/** Fecha máxima de nacimiento (AAAA-MM-DD) para tener 18 años hoy. */
export function fechaMaximaMayorDeEdad(hoy = new Date()): string {
  const anio = hoy.getFullYear() - 18;
  const mes = hoy.getMonth();
  const dia = Math.min(hoy.getDate(), new Date(anio, mes + 1, 0).getDate());
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/**
 * Correo válido sin contar los espacios de los extremos: el teclado del móvil suele añadir
 * un espacio al autocompletar, y el valor se recorta antes de enviarlo.
 */
export const correoValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' ? Validators.email({ value: control.value.trim() } as AbstractControl) : null;

export const mayorDeEdadValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  control.value && control.value > fechaMaximaMayorDeEdad() ? { menorDeEdad: true } : null;

/** Mensaje de error de la API: { error: "..." } o { errores: { campo: [...] } }. */
export function mensajeErrorApi(cuerpo: unknown, porDefecto: string): string {
  if (typeof cuerpo === 'object' && cuerpo !== null) {
    const c = cuerpo as { error?: unknown; errores?: Record<string, unknown> };
    if (typeof c.error === 'string') return c.error;
    if (c.errores && typeof c.errores === 'object') {
      const mensajes = Object.values(c.errores)
        .flatMap((m) => (Array.isArray(m) ? m : [m]))
        .filter((m): m is string => typeof m === 'string');
      if (mensajes.length) return mensajes.join(' ');
    }
  }
  return porDefecto;
}
