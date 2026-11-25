import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CategoriaPerfil, ModificarPerfilRequest, PerfilResponse, PerfilService } from './perfil.service';
import { EstadoSegundoFactor } from '../../shared/aviso-segundo-factor/estado-segundo-factor';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { MetodoPagoResponse, PagosService } from '../pagos/pagos.service';

const mayorDeEdad: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) {
    return null;
  }

  const fechaNacimiento = new Date(`${control.value}T00:00:00`);
  if (Number.isNaN(fechaNacimiento.getTime())) {
    return { fechaInvalida: true };
  }

  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const cumpleEsteAno = new Date(hoy.getFullYear(), fechaNacimiento.getMonth(), fechaNacimiento.getDate());
  if (hoy < cumpleEsteAno) {
    edad--;
  }

  return edad >= 18 ? null : { menorDeEdad: true };
};

const NOMBRES_TIPO_USUARIO: Record<string, string> = {
  CLIENTE: 'Cliente',
  VENDEDOR: 'Vendedor',
  ADMIN: 'Administrador'
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink],
  styleUrls: ['../tienda/tienda.css', './perfil.css'],
  templateUrl: './perfil.html'
})
export class Perfil {
  private readonly servicioPerfil = inject(PerfilService);
  private readonly estadoSegundoFactor = inject(EstadoSegundoFactor);
  private readonly servicioPagos = inject(PagosService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly enrutador = inject(Router);
  private readonly constructorFormularios = inject(FormBuilder);

  readonly perfil = signal<PerfilResponse | null>(null);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly editando = signal(false);
  readonly mensajeError = signal('');
  readonly mensajeFormulario = signal('');
  readonly mensajeExito = signal('');
  readonly mostrandoConfirmacionTipo = signal(false);
  readonly tipoPremiumPendiente = signal(false);
  // PBI 290: pago (simulado) al hacerse Premium
  readonly metodosPago = signal<MetodoPagoResponse[]>([]);
  readonly metodoPagoSeleccionado = signal('');
  readonly cargandoMetodosPago = signal(false);
  readonly errorPagoPremium = signal('');
  readonly pasoConfirmacionBaja = signal<0 | 1 | 2>(0);
  readonly bajaEnCurso = signal(false);
  readonly errorBaja = signal('');
  readonly descargaEnCurso = signal(false);
  readonly errorDescarga = signal('');
  readonly fechaMaximaNacimiento = this.calcularFechaMaximaNacimiento();
  readonly categorias = signal<CategoriaPerfil[]>([]);
  readonly configuracionTOTP = signal<{ otpauthUri: string | null; qrDataUrl: string | null } | null>(null);
  readonly codigosRespaldo = signal<string[]>([]);
  readonly codigoTOTP = signal('');
  readonly mensajeTOTP = signal('');
  readonly errorTOTP = signal('');
  readonly guardandoEmailOtp = signal(false);
  readonly errorEmailOtp = signal('');

  /** Nombre legible del tipo de usuario (el backend envía el valor del enum). */
  nombreTipoUsuario(tipo: string): string {
    return NOMBRES_TIPO_USUARIO[tipo] ?? tipo;
  }

  /** Inicial del avatar, siempre en mayúscula (B9). */
  inicial(nombre: string | null | undefined): string {
    return (nombre ?? '').trim().charAt(0).toLocaleUpperCase('es-ES');
  }
  readonly cargandoTOTP = signal(false);

  readonly cambiandoContrasena = signal(false);
  readonly errorContrasena = signal('');
  readonly mensajeContrasena = signal('');

  readonly formularioContrasena = this.constructorFormularios.nonNullable.group({
    contrasenaActual: ['', [Validators.required, Validators.maxLength(128)]],
    nuevaContrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
    confirmarContrasena: ['', [Validators.required, Validators.maxLength(128)]]
  });

  readonly formulario = this.constructorFormularios.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(150)]],
    telefono: ['', [Validators.maxLength(30), Validators.pattern(/^\+?[0-9\s().-]{7,20}$/)]],
    eliminarTelefono: [false],
    imagenPerfil: ['', [Validators.maxLength(1000), Validators.pattern(/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/i)]],
    dniNif: ['', [Validators.maxLength(9), Validators.pattern(/^\d{8}[A-Za-z]$/)]],
    fechaNacimiento: ['', [mayorDeEdad]],
    sede: ['', [Validators.maxLength(150)]],
    categoriaId: ['']
  });

  constructor() {
    this.cargarPerfil();
  }

  cargarPerfil(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.servicioPerfil.consultarPerfil().subscribe({
      next: (respuesta) => {
        this.perfil.set(respuesta);
        this.estadoSegundoFactor.activado.set(respuesta.totpActivado);
        if (respuesta.tipoUsuario === 'VENDEDOR') {
          this.servicioPerfil.obtenerCategorias().subscribe({
            next: (categorias) => this.categorias.set(categorias),
            error: () => this.categorias.set([])
          });
        }
        this.cargando.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.cargando.set(false);
        this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo cargar el perfil. Inténtalo de nuevo.'));
        if (error.status === 401) {
          this.enrutador.navigate(['/login'], {
            queryParams: { motivo: 'sesion-expirada' }
          });
        }
      }
    });
  }

  iniciarEdicion(): void {
    const datos = this.perfil();
    if (!datos) {
      return;
    }

    this.formulario.reset({
      nombre: datos.nombre,
      apellidos: datos.apellidos,
      telefono: '',
      eliminarTelefono: false,
      imagenPerfil: datos.imagenPerfil ?? '',
      dniNif: '',
      fechaNacimiento: datos.tipoUsuario === 'CLIENTE' ? datos.fechaNacimiento ?? '' : '',
      sede: datos.tipoUsuario === 'ADMIN' ? datos.sede ?? '' : '',
      categoriaId: ''
    });
    this.formulario.controls.fechaNacimiento.setValidators(
      datos.tipoUsuario === 'CLIENTE' ? [mayorDeEdad] : []
    );
    this.formulario.controls.fechaNacimiento.updateValueAndValidity();
    this.mensajeFormulario.set('');
    this.mensajeExito.set('');
    this.editando.set(true);
  }

  cancelarEdicion(): void {
    this.editando.set(false);
    this.mensajeFormulario.set('');
  }

  guardarCambios(): void {
    const datos = this.perfil();
    if (!datos || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.mensajeFormulario.set('Revisa los campos marcados antes de guardar.');
      return;
    }

    const valores = this.formulario.getRawValue();
    // El administrador no tiene teléfono; si se marca eliminarlo, se envía vacío.
    let telefono: string | null = null;
    if (datos.tipoUsuario !== 'ADMIN') {
      telefono = valores.eliminarTelefono ? '' : this.valorNulo(valores.telefono);
    }
    const solicitud: ModificarPerfilRequest = {
      nombre: valores.nombre.trim(),
      apellidos: valores.apellidos.trim(),
      telefono,
      imagenPerfil: this.valorNulo(valores.imagenPerfil)
    };

    if (datos.tipoUsuario === 'CLIENTE' || datos.tipoUsuario === 'VENDEDOR') {
      solicitud.dniNif = this.valorNulo(valores.dniNif);
    }
    if (datos.tipoUsuario === 'VENDEDOR') {
      solicitud.categoriaId = this.valorNulo(valores.categoriaId);
    }
    if (datos.tipoUsuario === 'CLIENTE') {
      solicitud.fechaNacimiento = this.valorNulo(valores.fechaNacimiento);
    }
    if (datos.tipoUsuario === 'ADMIN') {
      solicitud.sede = this.valorNulo(valores.sede);
    }

    this.guardando.set(true);
    this.mensajeFormulario.set('');
    this.mensajeExito.set('');

    this.servicioPerfil.modificarPerfil(solicitud).subscribe({
      next: (perfilActualizado) => {
        this.perfil.set(perfilActualizado);
        this.editando.set(false);
        this.guardando.set(false);
        this.mensajeExito.set('Los datos del perfil se han actualizado correctamente.');
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        this.mensajeFormulario.set(this.obtenerMensajeError(error, 'No se pudieron guardar los cambios.'));

        if (error.status === 401) {
          this.enrutador.navigate(['/login'], {
            queryParams: { motivo: 'sesion-expirada' }
          });
        }
      }
    });
  }

  cambiarTipoCliente(): void {
    const datos = this.perfil();
    if (!datos || datos.tipoUsuario !== 'CLIENTE' || this.guardando()) {
      return;
    }

    const nuevoTipoPremium = datos.esPremium !== true;
    this.tipoPremiumPendiente.set(nuevoTipoPremium);
    this.errorPagoPremium.set('');
    this.metodoPagoSeleccionado.set('');
    if (nuevoTipoPremium) {
      this.cargarMetodosPago();
    }
    this.mostrandoConfirmacionTipo.set(true);
  }

  private cargarMetodosPago(): void {
    this.cargandoMetodosPago.set(true);
    this.servicioPagos.consultarMetodos().subscribe({
      next: (metodos) => {
        this.metodosPago.set(metodos);
        if (metodos.length === 1) {
          this.metodoPagoSeleccionado.set(metodos[0].id);
        }
        this.cargandoMetodosPago.set(false);
      },
      error: () => {
        this.metodosPago.set([]);
        this.cargandoMetodosPago.set(false);
        this.errorPagoPremium.set('No se pudieron cargar tus métodos de pago.');
      }
    });
  }

  cancelarCambioTipoCliente(): void {
    this.mostrandoConfirmacionTipo.set(false);
  }

  confirmarCambioTipoCliente(): void {
    if (!this.mostrandoConfirmacionTipo() || this.guardando()) {
      return;
    }

    const nuevoTipoPremium = this.tipoPremiumPendiente();
    const metodoPagoId = nuevoTipoPremium ? this.metodoPagoSeleccionado() : null;
    if (nuevoTipoPremium && !metodoPagoId) {
      this.errorPagoPremium.set('Selecciona un método de pago para hacerte Premium.');
      return;
    }
    this.errorPagoPremium.set('');
    this.mostrandoConfirmacionTipo.set(false);
    this.guardando.set(true);
    this.mensajeFormulario.set('');
    this.mensajeExito.set('');

    this.servicioPerfil.cambiarTipoCliente(nuevoTipoPremium, metodoPagoId).subscribe({
      next: (perfilActualizado) => {
        this.perfil.set(perfilActualizado);
        this.guardando.set(false);
        this.mensajeExito.set(nuevoTipoPremium
          ? 'Pago realizado. Ya eres cliente Premium.'
          : 'El tipo de cliente se ha actualizado correctamente.');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error: HttpErrorResponse) => {
        this.guardando.set(false);
        const mensaje = this.obtenerMensajeError(error, 'No se pudo actualizar el tipo de cliente.');
        this.mensajeFormulario.set(mensaje);
        if (nuevoTipoPremium && error.status !== 401) {
          // Volvemos a mostrar el diálogo con el error del pago
          this.errorPagoPremium.set(mensaje);
          this.mostrandoConfirmacionTipo.set(true);
        }

        if (error.status === 401) {
          this.enrutador.navigate(['/login'], {
            queryParams: { motivo: 'sesion-expirada' }
          });
        }
      }
    });
  }

  // T-25: descarga de los datos personales del titular (blob + enlace temporal).
  descargarMisDatos(): void {
    if (this.descargaEnCurso()) {
      return;
    }
    this.descargaEnCurso.set(true);
    this.errorDescarga.set('');
    this.servicioPerfil.descargarMisDatos().subscribe({
      next: (contenido) => {
        this.descargaEnCurso.set(false);
        const direccion = URL.createObjectURL(contenido);
        const enlace = document.createElement('a');
        enlace.href = direccion;
        enlace.download = 'mis-datos.json';
        enlace.click();
        URL.revokeObjectURL(direccion);
      },
      error: (error: HttpErrorResponse) => {
        this.descargaEnCurso.set(false);
        if (error.status === 401) {
          this.enrutador.navigate(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
          return;
        }
        this.errorDescarga.set(error.status === 429
          ? 'Solo puedes descargar tus datos una vez por minuto. Inténtalo de nuevo en unos segundos.'
          : this.obtenerMensajeError(error, 'No se pudieron descargar tus datos. Inténtalo de nuevo.'));
      }
    });
  }

  iniciarBaja(): void {
    const tipoUsuario = this.perfil()?.tipoUsuario;
    if ((tipoUsuario !== 'CLIENTE' && tipoUsuario !== 'VENDEDOR') || this.bajaEnCurso()) {
      return;
    }
    this.errorBaja.set('');
    this.pasoConfirmacionBaja.set(1);
  }

  continuarBaja(): void {
    if (this.pasoConfirmacionBaja() === 1) {
      this.pasoConfirmacionBaja.set(2);
      return;
    }
    if (this.pasoConfirmacionBaja() !== 2) {
      return;
    }

    const tipoUsuario = this.perfil()?.tipoUsuario;
    if (tipoUsuario !== 'CLIENTE' && tipoUsuario !== 'VENDEDOR') {
      this.pasoConfirmacionBaja.set(0);
      return;
    }

    this.bajaEnCurso.set(true);
    this.errorBaja.set('');
    this.servicioPerfil.darDeBajaCuenta(tipoUsuario).subscribe({
      next: () => {
        this.bajaEnCurso.set(false);
        this.pasoConfirmacionBaja.set(0);
        this.enrutador.navigate(['/login'], { queryParams: { motivo: 'cuenta-eliminada' } });
      },
      error: (error: HttpErrorResponse) => {
        this.bajaEnCurso.set(false);
        this.pasoConfirmacionBaja.set(0);
        if (error.status === 401) {
          this.enrutador.navigate(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
          return;
        }
        this.errorBaja.set(this.obtenerMensajeError(error,
          'No se pudo eliminar la cuenta. Inténtalo de nuevo.'));
      }
    });
  }

  cancelarBaja(): void {
    if (!this.bajaEnCurso()) {
      this.pasoConfirmacionBaja.set(0);
    }
  }

  configurarTOTP(): void {
    this.cargandoTOTP.set(true);
    this.errorTOTP.set('');
    this.codigoTOTP.set('');
    this.mensajeTOTP.set('');
    this.servicioPerfil.configurarSegundoFactor().subscribe({
      next: (respuesta) => {
        this.cargandoTOTP.set(false);
        if (respuesta.enabled) {
          this.mensajeTOTP.set('El segundo factor ya está activado.');
          return;
        }
        this.configuracionTOTP.set({ otpauthUri: respuesta.otpauthUri, qrDataUrl: respuesta.qrDataUrl });
        this.mensajeTOTP.set('Escanea el QR con Google Authenticator o Authy y confirma el código.');
      },
      error: () => {
        this.cargandoTOTP.set(false);
        this.errorTOTP.set('No se pudo iniciar la configuración del segundo factor.');
      }
    });
  }

  confirmarTOTP(): void {
    const codigo = this.codigoTOTP().replace(/[\s-]/g, '');
    if (!/^\d{6}$/.test(codigo)) {
      this.errorTOTP.set('Introduce un código TOTP de 6 cifras.');
      return;
    }
    this.cargandoTOTP.set(true);
    this.errorTOTP.set('');
    this.servicioPerfil.confirmarSegundoFactor(codigo).subscribe({
      next: (respuesta) => {
        this.cargandoTOTP.set(false);
        this.codigosRespaldo.set(respuesta.backupCodes);
        this.configuracionTOTP.set(null);
        this.codigoTOTP.set('');
        this.mensajeTOTP.set('TOTP activado. Guarda estos códigos de respaldo en un lugar seguro.');
        this.perfil.update((valor) => valor ? { ...valor, totpActivado: true } : valor);
        this.estadoSegundoFactor.activado.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoTOTP.set(false);
        this.errorTOTP.set(this.obtenerMensajeError(error, 'No se pudo activar el segundo factor. Inténtalo de nuevo.'));
      }
    });
  }

  actualizarPreferenciaEmailOtp(evento: Event): void {
    const control = evento.target as HTMLInputElement;
    const activado = control.checked;
    // Mostrar únicamente la preferencia confirmada por el servidor.
    control.checked = this.perfil()?.emailOtpActivado ?? false;
    this.cambiarEmailOtp(activado);
  }

  cambiarEmailOtp(activado: boolean): void {
    const datos = this.perfil();

    if (!datos || datos.tipoUsuario !== 'CLIENTE' || this.guardandoEmailOtp() || this.cargandoTOTP()) {
      return;
    }

    if (activado && !datos.totpActivado) {
      this.errorEmailOtp.set(
        'Activa primero la verificación con tu aplicación de autenticación.'
      );
      return;
    }

    this.guardandoEmailOtp.set(true);
    this.errorEmailOtp.set('');

    this.servicioPerfil.modificarPreferenciaTercerFactor(activado)
      .subscribe({
        next: () => {
          this.guardandoEmailOtp.set(false);

          this.perfil.update(actual =>
            actual
              ? { ...actual, emailOtpActivado: activado }
              : actual
          );

          this.mensajeExito.set(
            activado
              ? 'Has activado la verificación adicional por correo.'
              : 'Has desactivado la verificación adicional por correo.'
          );
        },
        error: () => {
          this.guardandoEmailOtp.set(false);
          this.errorEmailOtp.set(
            'No se pudo actualizar la configuración de seguridad.'
          );
        }
      });
  }

  async desactivarTOTP(): Promise<void> {
    if (this.perfil()?.emailOtpActivado || this.guardandoEmailOtp()) {
      this.errorTOTP.set('Desactiva primero la verificación por correo.');
      return;
    }
    const codigo = this.codigoTOTP().replace(/[\s-]/g, '').toUpperCase();
    if (!/^(\d{6}|[A-Z2-7]{8}|[A-Z2-7]{16})$/.test(codigo)) {
      this.errorTOTP.set('Introduce un código actual de la aplicación o un código de respaldo para desactivar TOTP.');
      return;
    }
    const confirmado = await this.confirmacion.confirmar({
      titulo: 'Desactivar el segundo factor',
      mensaje: 'Tu cuenta quedará protegida solo con la contraseña.',
      aceptar: 'Desactivar',
      peligro: true
    });
    if (!confirmado) {
      return;
    }
    this.cargandoTOTP.set(true);
    this.errorTOTP.set('');
    this.mensajeTOTP.set('');
    this.servicioPerfil.desactivarSegundoFactor(codigo).subscribe({
      next: () => {
        this.cargandoTOTP.set(false);
        this.perfil.update((valor) => valor ? { ...valor, totpActivado: false } : valor);
        this.estadoSegundoFactor.activado.set(false);
        this.codigoTOTP.set('');
        this.codigosRespaldo.set([]);
        this.configuracionTOTP.set(null);
        this.mensajeTOTP.set('Segundo factor desactivado.');
      },
      error: (error: HttpErrorResponse) => {
        this.cargandoTOTP.set(false);
        this.errorTOTP.set(this.obtenerMensajeError(error, 'No se pudo desactivar el segundo factor.'));
      }
    });
  }

  /** T-05: cambia la contraseña con la sesión iniciada; el servidor cierra las demás sesiones. */
  cambiarContrasena(): void {
    this.errorContrasena.set('');
    this.mensajeContrasena.set('');

    if (this.formularioContrasena.invalid) {
      this.formularioContrasena.markAllAsTouched();
      this.errorContrasena.set('Completa los tres campos. La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }

    const { contrasenaActual, nuevaContrasena, confirmarContrasena } = this.formularioContrasena.getRawValue();
    if (nuevaContrasena !== confirmarContrasena) {
      this.errorContrasena.set('La contraseña nueva y su confirmación no coinciden.');
      return;
    }

    this.cambiandoContrasena.set(true);
    this.servicioPerfil.cambiarContrasena({ contrasenaActual, nuevaContrasena }).subscribe({
      next: () => {
        this.formularioContrasena.reset();
        this.cambiandoContrasena.set(false);
        this.mensajeContrasena.set('Contraseña actualizada. Se han cerrado tus otras sesiones.');
      },
      error: (error: HttpErrorResponse) => {
        this.cambiandoContrasena.set(false);
        this.errorContrasena.set(this.obtenerMensajeError(error, 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'));
      }
    });
  }

  private valorNulo(valor: string): string | null {
    const limpio = valor.trim();
    return limpio.length > 0 ? limpio : null;
  }

  private calcularFechaMaximaNacimiento(): string {
    const hoy = new Date();
    hoy.setFullYear(hoy.getFullYear() - 18);
    return hoy.toISOString().slice(0, 10);
  }

  private obtenerMensajeError(error: HttpErrorResponse, mensajeGenerico: string): string {
    if (error.status === 401) {
      return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.';
    }
    if (error.status === 403) {
      return 'No tienes permiso para modificar este perfil.';
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servicio. Inténtalo de nuevo.';
    }
    if (error.status >= 500) {
      return mensajeGenerico;
    }
    const mensaje = error.error?.error ?? error.error?.message;
    return typeof mensaje === 'string' ? mensaje : mensajeGenerico;
  }
}