import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}

export interface RegistroResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class RegistroService {
  private readonly http = inject(HttpClient);

  registrarCliente(request: RegistroClienteRequest): Observable<RegistroResponse> {
    return this.http.post<RegistroResponse>(`${environment.apiUrl}/cliente/register`, request);
  }
}
