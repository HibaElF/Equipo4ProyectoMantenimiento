
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import type { RespuestaTokenCsrf } from '../../shared/models/respuesta-token-csrf';
import { environment } from '../../../environments/environment';

export interface ClienteRegistrationRequest {
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

export interface VendedorRegistrationRequest {
  nombre: string;
  apellidos: string;
  dniNif: string;
  email: string;
  contrasena: string;
  categoriaId: string;
  nombreComercial: string;
  telefono?: string;
  imagenPerfil?: string;
}

export interface CategoriaRegistro {
  id: string;
  nombre: string;
}

export interface RegistrationResponse {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  obtenerCategoriasRegistro(): Observable<CategoriaRegistro[]> {
    return this.http.get<CategoriaRegistro[]>(
      `${environment.apiUrl}/categorias/registro`
    );
  }

  registerCliente(
    request: ClienteRegistrationRequest
  ): Observable<RegistrationResponse> {
    return this.publicarConCsrf('/cliente/register', request);
  }

  registerVendedor(
    request: VendedorRegistrationRequest
  ): Observable<RegistrationResponse> {
    return this.publicarConCsrf('/vendedor/register', request);
  }

  // El alta pública también exige el token CSRF (T-10): se pide antes de enviar el formulario.
  private publicarConCsrf(
    ruta: string,
    cuerpo: ClienteRegistrationRequest | VendedorRegistrationRequest
  ): Observable<RegistrationResponse> {
    return this.http
      .get<RespuestaTokenCsrf>(`${environment.apiUrl}/usuarios/csrf`, { withCredentials: true })
      .pipe(
        switchMap((respuestaCsrf) =>
          this.http.post<RegistrationResponse>(`${environment.apiUrl}${ruta}`, cuerpo, {
            withCredentials: true,
            headers: new HttpHeaders({ 'X-XSRF-TOKEN': respuestaCsrf.token })
          })
        )
      );
  }
}
