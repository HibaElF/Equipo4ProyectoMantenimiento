import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonAvatar,
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons';
import { RegistroService } from '../../core/auth/registro.service';
import {
  coincidenValidator,
  contrasenaSeguraValidator,
  estadoRequisitos,
  fechaMaximaMayorDeEdad,
  mayorDeEdadValidator,
  mensajeErrorApi, correoValidator } from '../../shared/validadores';

type Campo = 'nombre' | 'apellidos' | 'fechaNacimiento' | 'dniNif' | 'email' | 'telefono' | 'imagenPerfil' | 'contrasena' | 'repetirContrasena';

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonAvatar,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './registro.page.html'
})
export class RegistroPage {
  private readonly fb = inject(FormBuilder);
  private readonly registro = inject(RegistroService);

  readonly fechaMaxima = fechaMaximaMayorDeEdad();
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly exito = signal('');
  readonly avatarPorDefecto = 'avatars/cliente.svg';
  readonly fotoFallida = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      // Mismas longitudes máximas que el servidor (T-11).
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(150)]],
      fechaNacimiento: ['', [Validators.required, mayorDeEdadValidator]],
      dniNif: ['', [Validators.required, Validators.pattern(/^\d{8}[A-Za-z]$/)]],
      email: ['', [Validators.required, correoValidator, Validators.maxLength(254)]],
      // Solo espacio normal: ni tabuladores ni saltos de línea.
      telefono: ['', Validators.pattern(/^\+?[0-9 ().-]{7,20}$/)],
      // El servidor exige una URL HTTPS de hasta 1000 caracteres.
      imagenPerfil: ['', [Validators.maxLength(1000), Validators.pattern(/^https:\/\/[^\s/]+(?:\/\S*)?$/i)]],
      tipoCliente: ['normal' as 'normal' | 'premium'],
      contrasena: ['', [Validators.required, Validators.maxLength(128), contrasenaSeguraValidator]],
      repetirContrasena: ['', Validators.required],
      // T-24: consentimiento expreso, nunca premarcado.
      aceptaPolitica: [false, Validators.requiredTrue]
    },
    { validators: coincidenValidator('contrasena', 'repetirContrasena') }
  );

  constructor() {
    addIcons({ checkmarkCircle, ellipseOutline });
  }

  /** Vista previa de la foto: la URL escrita o, si falla o está vacía, el avatar por defecto. */
  fotoPerfil(): string {
    const url = this.form.controls.imagenPerfil.value.trim();
    return this.fotoFallida() || !url || this.form.controls.imagenPerfil.invalid ? this.avatarPorDefecto : url;
  }

  requisitos() {
    return estadoRequisitos(this.form.controls.contrasena.value);
  }

  errorDe(campo: Campo): string {
    const control = this.form.controls[campo];
    if (!control.touched) return '';
    if (campo === 'repetirContrasena' && this.form.hasError('noCoinciden')) {
      return 'Las contraseñas no coinciden.';
    }
    if (!control.errors) return '';
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('email')) return 'Introduce un correo electrónico válido.';
    if (control.hasError('menorDeEdad')) return 'Debes tener al menos 18 años.';
    if (control.hasError('contrasenaDebil')) return 'La contraseña debe cumplir todos los requisitos.';
    if (campo === 'dniNif') return 'El DNI/NIF debe tener 8 números y una letra.';
    if (campo === 'imagenPerfil') return 'Introduce una URL que empiece por https:// (máximo 1000 caracteres).';
    if (control.hasError('maxlength')) return 'Has superado la longitud máxima permitida.';
    if (campo === 'telefono') return 'Introduce un teléfono válido o deja el campo vacío.';
    return 'Revisa este campo.';
  }

  /** Mismo aviso que la web cuando no se marca la casilla de la política. */
  errorConsentimiento(): string {
    const control = this.form.controls.aceptaPolitica;
    return control.touched && control.invalid ? 'Debes aceptar la política de privacidad para registrarte.' : '';
  }

  registrar(): void {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid || this.enviando()) {
      this.error.set('Revisa los campos marcados.');
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.registro
      .registrarCliente({
        nombre: v.nombre.trim(),
        apellidos: v.apellidos.trim(),
        fechaNacimiento: v.fechaNacimiento,
        dniNif: v.dniNif.trim().toUpperCase(),
        email: v.email.trim(),
        contrasena: v.contrasena,
        esPremium: v.tipoCliente === 'premium',
        aceptaPolitica: v.aceptaPolitica,
        ...(v.telefono.trim() ? { telefono: v.telefono.trim() } : {}),
        ...(v.imagenPerfil.trim() ? { imagenPerfil: v.imagenPerfil.trim() } : {})
      })
      .subscribe({
        next: (respuesta) => {
          this.enviando.set(false);
          this.exito.set(respuesta?.mensaje || 'Hemos recibido tu solicitud de registro.');
          this.form.reset();
          this.fotoFallida.set(false);
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.error.set(
            e.status === 0
              ? 'No se pudo conectar con el servidor. Comprueba tu conexión.'
              : mensajeErrorApi(e.error, 'No se pudo completar el registro. Inténtalo de nuevo.')
          );
        }
      });
  }
}
