import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonNote,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { ModificarPerfilRequest, Perfil } from '../../core/models/perfil';
import { PerfilService, mensajeErrorPerfil } from '../../core/services/perfil.service';
import { AvatarPerfilComponent } from '../../shared/avatar-perfil/avatar-perfil.component';
import { fechaMaximaMayorDeEdad, mayorDeEdadValidator } from '../../shared/validadores';

/** Mismas reglas que el formulario «Editar perfil» de la web. */
export const PATRON_TELEFONO = /^\+?[0-9\s().-]{7,20}$/;
export const PATRON_IMAGEN = /^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i;
export const PATRON_DNI = /^\d{8}[A-Za-z]$/;

function valorNulo(valor: string): string | null {
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : null;
}

/** «Mis datos y foto»: consulta y edición de los datos del cliente. */
@Component({
  selector: 'app-mis-datos',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    AvatarPerfilComponent,
    IonBackButton,
    IonButton,
    IonButtons,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonInput,
    IonNote,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './mis-datos.page.html',
  styleUrl: './mis-datos.page.css'
})
export class MisDatosPage {
  private readonly perfilApi = inject(PerfilService);
  private readonly toasts = inject(ToastController);

  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly editando = signal(false);
  readonly guardando = signal(false);
  readonly errorFormulario = signal('');
  readonly fechaMaxima = fechaMaximaMayorDeEdad();

  readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(150)]],
    telefono: ['', [Validators.maxLength(30), Validators.pattern(PATRON_TELEFONO)]],
    eliminarTelefono: [false],
    imagenPerfil: ['', [Validators.maxLength(1000), Validators.pattern(PATRON_IMAGEN)]],
    dniNif: ['', [Validators.maxLength(9), Validators.pattern(PATRON_DNI)]],
    fechaNacimiento: ['', [mayorDeEdadValidator]]
  });

  constructor() {
    addIcons({ closeOutline });
  }

  ionViewWillEnter(): void {
    if (!this.editando()) this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    this.perfilApi.consultar().subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(mensajeErrorPerfil(e, 'No se pudo cargar el perfil. Inténtalo de nuevo.'));
      }
    });
  }

  iniciarEdicion(): void {
    const p = this.perfil();
    if (!p) return;
    // Teléfono y DNI se dejan vacíos para conservar los actuales (el DNI llega protegido).
    this.formulario.reset({
      nombre: p.nombre,
      apellidos: p.apellidos,
      telefono: '',
      eliminarTelefono: false,
      imagenPerfil: p.imagenPerfil ?? '',
      dniNif: '',
      fechaNacimiento: p.fechaNacimiento ?? ''
    });
    this.errorFormulario.set('');
    this.editando.set(true);
  }

  cancelarEdicion(): void {
    this.editando.set(false);
    this.errorFormulario.set('');
  }

  /** Vista previa de la foto mientras se escribe la URL (solo si es una URL HTTPS válida). */
  fotoPrevia(): string | null {
    const c = this.formulario.controls.imagenPerfil;
    return c.valid && c.value.trim() ? c.value.trim() : null;
  }

  errorDe(campo: keyof typeof this.formulario.controls): string {
    const c = this.formulario.controls[campo];
    if (!c.touched || c.valid) return '';
    switch (campo) {
      case 'nombre':
        return c.hasError('required') ? 'El nombre es obligatorio.' : 'Máximo 100 caracteres.';
      case 'apellidos':
        return c.hasError('required') ? 'Los apellidos son obligatorios.' : 'Máximo 150 caracteres.';
      case 'telefono':
        return 'Introduce un teléfono válido o deja el campo vacío.';
      case 'imagenPerfil':
        return 'Introduce una URL HTTPS válida.';
      case 'dniNif':
        return 'El DNI/NIF debe tener 8 números y una letra.';
      case 'fechaNacimiento':
        return 'Debes ser mayor de edad.';
      default:
        return '';
    }
  }

  guardar(): void {
    const p = this.perfil();
    if (!p || this.guardando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.errorFormulario.set('Revisa los campos marcados antes de guardar.');
      return;
    }
    const v = this.formulario.getRawValue();
    const solicitud: ModificarPerfilRequest = {
      nombre: v.nombre.trim(),
      apellidos: v.apellidos.trim(),
      telefono: v.eliminarTelefono ? '' : valorNulo(v.telefono),
      imagenPerfil: valorNulo(v.imagenPerfil),
      dniNif: valorNulo(v.dniNif),
      fechaNacimiento: valorNulo(v.fechaNacimiento)
    };
    this.guardando.set(true);
    this.errorFormulario.set('');
    this.perfilApi.modificar(solicitud).subscribe({
      next: (actualizado) => {
        this.perfil.set(actualizado);
        this.guardando.set(false);
        this.editando.set(false);
        this.aviso('Los datos del perfil se han actualizado correctamente.');
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeErrorPerfil(e, 'No se pudieron guardar los cambios.'));
      }
    });
  }

  private async aviso(mensaje: string): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: 2500,
      position: 'top',
      color: 'primary',
      buttons: [{ icon: 'close-outline', role: 'cancel', side: 'end', htmlAttributes: { 'aria-label': 'Cerrar aviso' } }]
    });
    await toast.present();
  }
}
