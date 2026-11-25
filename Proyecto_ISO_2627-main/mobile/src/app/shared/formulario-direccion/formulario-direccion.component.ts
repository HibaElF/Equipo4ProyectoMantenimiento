import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { Direccion, DireccionRequest } from '../../core/models/direccion';
import { DireccionesService } from '../../core/services/direcciones.service';

type Campo = 'nombre' | 'calle' | 'numero' | 'portal' | 'piso' | 'codigoPostal' | 'ciudad' | 'provincia';

/**
 * Formulario para añadir o modificar una dirección (mismos campos y límites que la web).
 * Se abre como ventana desde «Mis direcciones» y desde la compra; al guardar devuelve la dirección.
 */
@Component({
  selector: 'app-formulario-direccion',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonList,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './formulario-direccion.component.html'
})
export class FormularioDireccionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly direccionesApi = inject(DireccionesService);
  private readonly ventana = inject(ModalController);

  /**
   * Dirección a modificar; sin ella, se crea una nueva.
   * Es un @Input clásico porque Ionic lo asigna directamente al abrir la ventana (componentProps).
   */
  @Input() direccion: Direccion | null = null;

  readonly guardando = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    calle: ['', [Validators.required, Validators.maxLength(150)]],
    numero: ['', [Validators.required, Validators.maxLength(10)]],
    portal: ['', Validators.maxLength(10)],
    piso: ['', Validators.maxLength(10)],
    codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    ciudad: ['', [Validators.required, Validators.maxLength(80)]],
    provincia: ['', [Validators.required, Validators.maxLength(80)]]
  });

  constructor() {
    addIcons({ closeOutline });
  }

  ngOnInit(): void {
    const d = this.direccion;
    if (d) {
      this.form.reset({
        nombre: d.nombre,
        calle: d.calle,
        numero: d.numero,
        portal: d.portal ?? '',
        piso: d.piso ?? '',
        codigoPostal: d.codigoPostal,
        ciudad: d.ciudad,
        provincia: d.provincia
      });
    }
  }

  errorDe(campo: Campo): string {
    const c = this.form.controls[campo];
    if (!c.touched || !c.errors) return '';
    if (c.hasError('required')) return 'Este campo es obligatorio.';
    if (c.hasError('pattern')) return 'El código postal debe tener 5 números.';
    if (c.hasError('maxlength')) return `Máximo ${c.getError('maxlength').requiredLength} caracteres.`;
    return 'Revisa este campo.';
  }

  cerrar(): void {
    this.ventana.dismiss(null, 'cancel');
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set('Revisa los campos marcados antes de guardar.');
      return;
    }
    const v = this.form.getRawValue();
    const vacioANulo = (t: string) => (t.trim() ? t.trim() : null);
    const request: DireccionRequest = {
      nombre: v.nombre.trim(),
      calle: v.calle.trim(),
      numero: v.numero.trim(),
      portal: vacioANulo(v.portal),
      piso: vacioANulo(v.piso),
      codigoPostal: v.codigoPostal.trim(),
      ciudad: v.ciudad.trim(),
      provincia: v.provincia.trim()
    };
    const existente = this.direccion;
    this.guardando.set(true);
    this.error.set('');
    (existente ? this.direccionesApi.modificar(existente.id, request) : this.direccionesApi.agregar(request)).subscribe({
      next: (guardada) => {
        this.guardando.set(false);
        this.ventana.dismiss(guardada, 'guardado');
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        this.error.set(mensajeErrorDireccion(e, 'No se pudo guardar la dirección.'));
      }
    });
  }
}

/** Mismos mensajes que la web. */
export function mensajeErrorDireccion(e: HttpErrorResponse, porDefecto: string): string {
  if (e.status === 0) return 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
  if (e.status === 403) return 'No tienes permiso para acceder a estas direcciones.';
  if (e.status === 409) {
    return (
      e.error?.message ??
      'No se puede modificar ni eliminar esta dirección porque está vinculada a un pedido en curso.'
    );
  }
  return e.error?.message ?? porDefecto;
}
