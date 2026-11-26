import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

/** Mismos datos que envía la web al registrar un cliente (POST /cliente/register). */
export interface RegistroClienteRequest {
  nombre: string;
  apellidos: string;
  fechaNacimiento: string;
  dniNif: string;
  email: string;
  contrasena: string;
  telefono?: string;
  imagenPerfil?: string;
  esPremium: boolean;
  /** T-24: consentimiento expreso de la política de privacidad. */
  aceptaPolitica: boolean;
}

export interface RegistroResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class RegistroService {
  private readonly auth = inject(AuthService);

  /** El alta pública también exige el token CSRF (T-10), igual que en la web. */
  registrarCliente(request: RegistroClienteRequest): Observable<RegistroResponse> {
    return this.auth.postConCsrf<RegistroResponse>('/cliente/register', request);
  }
}
