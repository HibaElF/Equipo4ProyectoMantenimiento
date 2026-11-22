import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonInputPasswordToggle,
  IonList,
  IonItem,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { AuthService, RespuestaInicioSesion } from '../../core/auth/auth.service';

type Paso = 'credenciales' | 'segundo-factor' | 'tercer-factor';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonInputPasswordToggle,
    IonList,
    IonItem,
    IonNote,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly paso = signal<Paso>('credenciales');
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly info = signal('');

  email = '';
  contrasena = '';
  codigo = '';

  enviar(): void {
    this.error.set('');
    switch (this.paso()) {
      case 'credenciales':
        this.iniciarSesion();
        break;
      case 'segundo-factor':
        this.verificarSegundoFactor();
        break;
      case 'tercer-factor':
        this.verificarTercerFactor();
        break;
    }
  }

  private iniciarSesion(): void {
    if (!this.email.trim() || !this.contrasena) {
      this.error.set('Introduce tu correo y tu contraseña.');
      return;
    }
    this.cargando.set(true);
    this.auth.iniciarSesion(this.email.trim(), this.contrasena).subscribe({
      next: (respuesta) => this.procesarRespuesta(respuesta),
      error: (e: HttpErrorResponse) => this.mostrarError(e)
    });
  }

  private verificarSegundoFactor(): void {
    const codigo = this.codigo.replace(/[\s-]/g, '').toUpperCase();
    if (!/^(\d{6}|[A-Z2-7]{8}|[A-Z2-7]{16})$/.test(codigo)) {
      this.error.set('Introduce el código de 6 cifras de tu aplicación o un código de respaldo.');
      return;
    }
    this.cargando.set(true);
    this.auth.verificarSegundoFactor(codigo).subscribe({
      next: (respuesta) => this.procesarRespuesta(respuesta),
      error: (e: HttpErrorResponse) => this.mostrarError(e, 'El código no es válido o ya se ha utilizado.')
    });
  }

  private verificarTercerFactor(): void {
    const codigo = this.codigo.trim();
    if (!codigo) {
      this.error.set('Introduce el código que has recibido por correo.');
      return;
    }
    this.cargando.set(true);
    this.auth.verificarTercerFactor(codigo).subscribe({
      next: (respuesta) => this.procesarRespuesta(respuesta),
      error: (e: HttpErrorResponse) => this.mostrarError(e, 'El código no es válido o ha caducado.')
    });
  }

  reenviarCodigoCorreo(): void {
    this.error.set('');
    this.cargando.set(true);
    this.auth.reenviarTercerFactor().subscribe({
      next: () => {
        this.cargando.set(false);
        this.info.set('Te hemos enviado un código nuevo a tu correo.');
      },
      error: (e: HttpErrorResponse) => this.mostrarError(e, 'No se pudo enviar el código.')
    });
  }

  volverAlInicio(): void {
    this.paso.set('credenciales');
    this.codigo = '';
    this.info.set('');
    this.error.set('');
  }

  private procesarRespuesta(respuesta: RespuestaInicioSesion): void {
    this.cargando.set(false);
    this.codigo = '';

    // La app es solo para clientes: los demás roles usan la web.
    if (respuesta.role !== 'CLIENTE' || respuesta.requiresTwoFactorSetup) {
      this.auth.cerrarSesion().subscribe({ error: () => undefined });
      this.volverAlInicio();
      this.error.set('Esta aplicación es solo para clientes. Accede a la web con tu cuenta.');
      return;
    }
    if (respuesta.requiresTwoFactor) {
      this.paso.set('segundo-factor');
      this.info.set('Introduce el código de tu aplicación de autenticación.');
      return;
    }
    if (respuesta.requiresEmailVerification) {
      this.paso.set('tercer-factor');
      this.info.set(
        respuesta.emailVerificationEmailSent
          ? 'Introduce el código que te hemos enviado por correo.'
          : 'No se pudo enviar el código. Pulsa en «Reenviar código».'
      );
      return;
    }
    this.contrasena = '';
    this.router.navigateByUrl('/inicio', { replaceUrl: true });
  }

  private mostrarError(e: HttpErrorResponse, porDefecto?: string): void {
    this.cargando.set(false);
    if (e.status === 410) {
      this.volverAlInicio();
      this.error.set('La verificación ha caducado. Vuelve a iniciar sesión.');
      return;
    }
    if (e.status === 0) {
      this.error.set('No se pudo conectar con el servidor. Comprueba tu conexión.');
      return;
    }
    const mensaje = e.error?.error;
    this.error.set(
      typeof mensaje === 'string' ? mensaje : porDefecto ?? 'No se pudo iniciar sesión. Inténtalo de nuevo.'
    );
  }
}
