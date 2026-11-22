import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { RecuperacionContrasenaService } from '../../core/auth/recuperacion-contrasena.service';
import {
  coincidenValidator,
  contrasenaSeguraValidator,
  estadoRequisitos,
  mensajeErrorApi
} from '../../shared/validadores';

/*
 * Dos modos, como en la web:
 *  - Sin token: pide el correo y el backend envía un enlace.
 *  - Con ?token=...: permite escribir la contraseña nueva.
 * El enlace del correo apunta a la web (APP_FRONTEND_URL); al probar en el navegador
 * con la app en el mismo puerto, también abre esta pantalla.
 */
@Component({
  selector: 'app-recuperar-contrasena',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonList,
    IonNote,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './recuperar-contrasena.page.html'
})
export class RecuperarContrasenaPage {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(RecuperacionContrasenaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly modoNuevaContrasena = this.token.length > 0;

  readonly cargando = signal(false);
  readonly error = signal('');
  readonly solicitudEnviada = signal(false);
  readonly contrasenaCambiada = signal(false);

  readonly solicitudForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly nuevaForm = this.fb.nonNullable.group(
    {
      nuevaContrasena: ['', [Validators.required, contrasenaSeguraValidator]],
      confirmarContrasena: ['', Validators.required]
    },
    { validators: coincidenValidator('nuevaContrasena', 'confirmarContrasena') }
  );

  constructor() {
    addIcons({ checkmarkCircle, ellipseOutline });
    if (this.token) {
      // El token se guarda en memoria y se quita de la URL para que no quede en el historial.
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }
  }

  requisitos() {
    return estadoRequisitos(this.nuevaForm.controls.nuevaContrasena.value);
  }

  emailInvalido(): boolean {
    const c = this.solicitudForm.controls.email;
    return c.touched && c.invalid;
  }

  noCoinciden(): boolean {
    return this.nuevaForm.controls.confirmarContrasena.touched && this.nuevaForm.hasError('noCoinciden');
  }

  solicitar(): void {
    this.error.set('');
    this.solicitudForm.markAllAsTouched();
    if (this.solicitudForm.invalid || this.cargando()) return;
    this.cargando.set(true);
    this.servicio.solicitar(this.solicitudForm.controls.email.value.trim()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.solicitudEnviada.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          e.status === 0
            ? 'No se pudo conectar con el servidor. Comprueba tu conexión.'
            : 'No se pudo procesar la solicitud. Inténtalo de nuevo más tarde.'
        );
      }
    });
  }

  cambiarContrasena(): void {
    this.error.set('');
    this.nuevaForm.markAllAsTouched();
    if (this.nuevaForm.invalid || this.cargando()) {
      this.error.set('La contraseña debe cumplir todos los requisitos y coincidir en los dos campos.');
      return;
    }
    this.cargando.set(true);
    this.servicio.confirmar(this.token, this.nuevaForm.controls.nuevaContrasena.value).subscribe({
      next: () => {
        this.cargando.set(false);
        this.contrasenaCambiada.set(true);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(
          mensajeErrorApi(e.error, 'No se pudo cambiar la contraseña. Comprueba el enlace e inténtalo de nuevo.')
        );
      }
    });
  }
}
