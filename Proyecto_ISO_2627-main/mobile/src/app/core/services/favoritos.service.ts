import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Favoritos } from '../models/favoritos';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/usuarios/favoritos`;

  consultar(): Observable<Favoritos> {
    return this.http.get<Favoritos>(this.url, { withCredentials: true });
  }

  anadir(productoId: string): Observable<Favoritos> {
    return this.auth.peticionConCsrf<Favoritos>('PUT', `/usuarios/favoritos/${encodeURIComponent(productoId)}`);
  }

  quitar(productoId: string): Observable<Favoritos> {
    return this.auth.peticionConCsrf<Favoritos>('DELETE', `/usuarios/favoritos/${encodeURIComponent(productoId)}`);
  }
}
