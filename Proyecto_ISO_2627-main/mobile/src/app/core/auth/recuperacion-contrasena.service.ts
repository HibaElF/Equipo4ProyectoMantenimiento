import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RecuperacionContrasenaService {
  private readonly auth = inject(AuthService);

  /** Envía al correo un enlace para cambiar la contraseña. */
  solicitar(email: string): Observable<{ message: string }> {
    return this.auth.postConCsrf<{ message: string }>('/usuarios/recuperar-contrasena', { email });
  }

  /** Cambia la contraseña con el token del enlace recibido por correo. */
  confirmar(token: string, nuevaContrasena: string): Observable<void> {
    return this.auth.postConCsrf<void>('/usuarios/recuperar-contrasena/confirmar', {
      token,
      nuevaContrasena
    });
  }
}
