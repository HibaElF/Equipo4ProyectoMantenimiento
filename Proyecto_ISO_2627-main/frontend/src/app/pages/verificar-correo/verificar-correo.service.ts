import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { RespuestaTokenCsrf } from '../../shared/models/respuesta-token-csrf';

@Injectable({ providedIn: 'root' })
export class VerificarCorreoService {
  private readonly http = inject(HttpClient);

  // Público, pero como el resto de los POST exige el token CSRF.
  verificar(token: string): Observable<void> {
    return this.http
      .get<RespuestaTokenCsrf>(`${environment.apiUrl}/usuarios/csrf`, { withCredentials: true })
      .pipe(
        switchMap(({ token: csrf }) =>
          this.http.post<void>(
            `${environment.apiUrl}/usuarios/verificar-correo`,
            { token },
            {
              withCredentials: true,
              headers: new HttpHeaders({ 'X-XSRF-TOKEN': csrf })
            }
          )
        )
      );
  }
}
