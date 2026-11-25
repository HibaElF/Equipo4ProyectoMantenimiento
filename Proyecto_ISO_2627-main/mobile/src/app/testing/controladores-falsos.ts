import { AlertController, ModalController, ToastController } from '@ionic/angular';

/** Botón de una alerta tal como se pasa a AlertController.create. */
interface BotonAlerta {
  text: string;
  role?: string;
  handler?: () => unknown;
}

/**
 * Controladores de Ionic falsos para los tests: guardan lo que la página pide mostrar
 * y permiten «pulsar» botones de una alerta o decidir cómo se cierra un formulario.
 */
export class AlertasFalsas {
  readonly creadas: { header?: string; message?: string; buttons: BotonAlerta[] }[] = [];

  create = vi.fn(async (opciones: { header?: string; message?: string; buttons: BotonAlerta[] }) => {
    this.creadas.push(opciones);
    return { present: vi.fn(async () => undefined) };
  });

  /** Pulsa el botón con ese texto de la última alerta creada. */
  pulsar(texto: string): unknown {
    const boton = this.creadas.at(-1)?.buttons.find((b) => b.text === texto);
    if (!boton) throw new Error(`No hay ningún botón «${texto}» en la última alerta`);
    return boton.handler?.();
  }
}

export class ModalesFalsos {
  /** Cómo se cerrará la próxima ventana (por ejemplo, 'guardado' o 'cancel'). */
  rolAlCerrar = 'cancel';
  /** Datos con los que se cerrará (por ejemplo, la dirección recién guardada). */
  datosAlCerrar: unknown = undefined;
  readonly creados: unknown[] = [];

  create = vi.fn(async (opciones: unknown) => {
    this.creados.push(opciones);
    return {
      present: vi.fn(async () => undefined),
      onWillDismiss: vi.fn(async () => ({ role: this.rolAlCerrar, data: this.datosAlCerrar }))
    };
  });

  dismiss = vi.fn(async () => true);
}

export class ToastsFalsos {
  readonly mensajes: string[] = [];

  create = vi.fn(async (opciones: { message: string }) => {
    this.mensajes.push(opciones.message);
    return { present: vi.fn(async () => undefined) };
  });
}

/** Proveedores para sustituir los controladores reales en TestBed. */
export function controladoresFalsos() {
  const alertas = new AlertasFalsas();
  const modales = new ModalesFalsos();
  const toasts = new ToastsFalsos();
  return {
    alertas,
    modales,
    toasts,
    providers: [
      { provide: AlertController, useValue: alertas },
      { provide: ModalController, useValue: modales },
      { provide: ToastController, useValue: toasts }
    ]
  };
}
