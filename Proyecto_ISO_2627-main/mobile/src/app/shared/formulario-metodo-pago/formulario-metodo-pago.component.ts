import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, lockClosedOutline } from 'ionicons/icons';
import { MetodoPagoRequest, TipoPago } from '../../core/models/metodo-pago';
import { PagosService } from '../../core/services/pagos.service';
import {
  errorCaducidad,
  errorCorreoPaypal,
  errorCvv,
  errorNumeroTarjeta,
  errorTelefonoBizum,
  errorTitular,
  formatearCaducidad,
  formatearNumeroTarjeta
} from '../validadores-pago';

/**
 * Formulario para registrar un método de pago (tarjeta, PayPal o Bizum), como en la web.
 * Se abre como ventana desde «Métodos de pago» y desde la compra; al guardar devuelve el método.
 */
@Component({
  selector: 'app-formulario-metodo-pago',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './formulario-metodo-pago.component.html'
})
export class FormularioMetodoPagoComponent implements OnInit {
  private readonly pagosApi = inject(PagosService);
  private readonly ventana = inject(ModalController);
  private readonly fb = inject(FormBuilder);

  readonly tipos = signal<TipoPago[]>([]);
  readonly cargandoTipos = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly tipo = signal('');

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(50)]],
    numeroTarjeta: [''],
    titular: [''],
    caducidad: [''],
    cvv: [''],
    correoPaypal: [''],
    telefonoBizum: ['']
  });

  readonly tiposVisibles = computed(() =>
    this.tipos().length
      ? this.tipos()
      : [
          { codigo: 'TARJETA', nombre: 'Tarjeta' },
          { codigo: 'PAYPAL', nombre: 'PayPal' },
          { codigo: 'BIZUM', nombre: 'Bizum' }
        ]
  );

  constructor() {
    addIcons({ closeOutline, lockClosedOutline });
  }

  ngOnInit(): void {
    this.pagosApi.consultarTipos().subscribe({
      next: (tipos) => {
        this.tipos.set(tipos);
        this.cambiarTipo(this.tipo() || tipos[0]?.codigo || 'TARJETA');
        this.cargandoTipos.set(false);
      },
      error: () => {
        this.cargandoTipos.set(false);
        this.cambiarTipo(this.tipo() || 'TARJETA');
      }
    });
  }

  /** Cada tipo valida solo sus campos (mismas reglas que el backend). */
  cambiarTipo(valor: string | number | undefined): void {
    const tipo = String(valor ?? '');
    this.tipo.set(tipo);
    this.error.set('');
    const regla = (fn: (v: string) => string): ValidatorFn => (c: AbstractControl) => {
      const mensaje = fn(String(c.value ?? ''));
      return mensaje ? { mensaje } : null;
    };
    const reglas: Record<string, ValidatorFn | null> = {
      numeroTarjeta: tipo === 'TARJETA' ? regla(errorNumeroTarjeta) : null,
      titular: tipo === 'TARJETA' ? regla(errorTitular) : null,
      caducidad: tipo === 'TARJETA' ? regla((v) => errorCaducidad(v)) : null,
      cvv: tipo === 'TARJETA' ? regla(errorCvv) : null,
      correoPaypal: tipo === 'PAYPAL' ? regla(errorCorreoPaypal) : null,
      telefonoBizum: tipo === 'BIZUM' ? regla(errorTelefonoBizum) : null
    };
    for (const [campo, validador] of Object.entries(reglas)) {
      const control = this.form.get(campo)!;
      control.setValidators(validador);
      control.updateValueAndValidity({ emitEvent: false });
    }
  }

  escribirNumero(valor: string | null | undefined): void {
    this.form.controls.numeroTarjeta.setValue(formatearNumeroTarjeta(valor ?? ''));
  }

  escribirCaducidad(valor: string | null | undefined): void {
    this.form.controls.caducidad.setValue(formatearCaducidad(valor ?? ''));
  }

  errorDe(campo: keyof typeof this.form.controls): string {
    const c = this.form.controls[campo];
    if (!c.touched || !c.errors) return '';
    if (c.errors['servidor']) return c.errors['servidor'];
    if (c.errors['mensaje']) return c.errors['mensaje'];
    if (c.hasError('required')) return 'Ponle un nombre para reconocerlo.';
    if (c.hasError('maxlength')) return 'Máximo 50 caracteres.';
    return 'Revisa este campo.';
  }

  cerrar(): void {
    this.ventana.dismiss(null, 'cancel');
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (!this.tipo()) {
      this.error.set('Elige un tipo de pago.');
      return;
    }
    if (this.form.invalid) {
      this.error.set('Revisa los campos marcados antes de guardar.');
      return;
    }
    const v = this.form.getRawValue();
    const vacioANulo = (t: string) => (t.trim() ? t.trim() : null);
    const tipo = this.tipo();
    const request: MetodoPagoRequest = {
      tipo,
      nombre: v.nombre.trim(),
      numeroTarjeta: tipo === 'TARJETA' ? v.numeroTarjeta.replace(/\s/g, '') : null,
      titular: tipo === 'TARJETA' ? vacioANulo(v.titular) : null,
      caducidad: tipo === 'TARJETA' ? vacioANulo(v.caducidad) : null,
      cvv: tipo === 'TARJETA' ? vacioANulo(v.cvv) : null,
      correoPaypal: tipo === 'PAYPAL' ? vacioANulo(v.correoPaypal) : null,
      telefonoBizum: tipo === 'BIZUM' ? vacioANulo(v.telefonoBizum) : null
    };
    this.guardando.set(true);
    this.error.set('');
    this.pagosApi.registrar(request).subscribe({
      next: (metodo) => {
        this.guardando.set(false);
        this.ventana.dismiss(metodo, 'guardado');
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        if (e.status === 400 && e.error?.errores) {
          const mensajes: string[] = [];
          for (const [campo, lista] of Object.entries(e.error.errores as Record<string, string[] | string>)) {
            const texto = Array.isArray(lista) ? lista.join(' ') : String(lista);
            mensajes.push(texto);
            this.form.get(campo)?.setErrors({ servidor: texto });
          }
          this.error.set(mensajes.join(' ') || 'Revisa los datos introducidos.');
        } else {
          this.error.set(
            e.status === 0
              ? 'No se pudo conectar con el servicio. Inténtalo de nuevo.'
              : e.status === 403
                ? 'No tienes permiso para registrar métodos de pago.'
                : (e.error?.message ?? 'No se pudo guardar el método.')
          );
        }
      }
    });
  }
}
