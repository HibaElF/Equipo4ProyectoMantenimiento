/** Datos de «Mi perfil» (mismo contrato que la web: GET/PUT /usuarios/perfil). */
export interface Perfil {
  tipoUsuario: 'ADMIN' | 'CLIENTE' | 'VENDEDOR';
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  imagenPerfil: string | null;
  /** El backend lo devuelve protegido (enmascarado). */
  dniNif: string | null;
  fechaNacimiento: string | null;
  esPremium: boolean | null;
  totpActivado: boolean;
  emailOtpActivado: boolean;
}

export interface ModificarPerfilRequest {
  nombre: string;
  apellidos: string;
  /** null conserva el actual; '' lo elimina. */
  telefono: string | null;
  imagenPerfil: string | null;
  dniNif: string | null;
  fechaNacimiento: string | null;
}

export interface ConfiguracionSegundoFactor {
  otpauthUri: string | null;
  qrDataUrl: string | null;
  enabled: boolean;
}

export interface ConfirmacionSegundoFactor {
  enabled: boolean;
  backupCodes: string[];
}

export function inicialPerfil(nombre: string | null | undefined): string {
  return (nombre ?? '').trim().charAt(0).toLocaleUpperCase('es-ES');
}

/** Clave secreta de la URI otpauth, para escribirla a mano en la app de autenticación. */
export function secretoTotp(otpauthUri: string | null): string | null {
  if (!otpauthUri) return null;
  const consulta = otpauthUri.split('?')[1] ?? '';
  const secreto = new URLSearchParams(consulta).get('secret');
  return secreto ? secreto.replace(/(.{4})/g, '$1 ').trim() : null;
}
