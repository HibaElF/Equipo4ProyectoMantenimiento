import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { Observable } from 'rxjs';

// Estado de cada apartado de una página de estadísticas. Cada uno se carga por separado,
// así que si falla uno los demás se siguen viendo.
export class ApartadoEstadisticas<T> {
  readonly datos = signal<T | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  constructor(private readonly mensajeError: (fallo: HttpErrorResponse) => string) {}

  cargar(peticion: Observable<T>): void {
    this.cargando.set(true);
    this.error.set('');

    peticion.subscribe({
      next: (datos) => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: (fallo: HttpErrorResponse) => {
        this.datos.set(null);
        this.cargando.set(false);
        this.error.set(this.mensajeError(fallo));
      }
    });
  }
}
