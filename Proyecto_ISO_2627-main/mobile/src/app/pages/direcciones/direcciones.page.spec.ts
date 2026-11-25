import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Direccion } from '../../core/models/direccion';
import { DireccionesService } from '../../core/services/direcciones.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { DireccionesPage } from './direcciones.page';

const casa: Direccion = {
  id: 'd1', nombre: 'Casa', calle: 'Calle Mayor', numero: '3', codigoPostal: '13001', ciudad: 'Ciudad Real', provincia: 'CR'
};

describe('DireccionesPage', () => {
  const api = { consultar: vi.fn(), eliminar: vi.fn() };

  function crear() {
    const falsos = controladoresFalsos();
    TestBed.configureTestingModule({
      imports: [DireccionesPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: DireccionesService, useValue: api }, ...falsos.providers]
    });
    const pagina = TestBed.createComponent(DireccionesPage).componentInstance;
    return { pagina, ...falsos };
  }

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.consultar.mockReturnValue(of([casa]));
  });

  it('carga las direcciones', () => {
    expect(crear().pagina.direcciones()).toEqual([casa]);
  });

  it('muestra el error si no se pueden cargar', () => {
    api.consultar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(crear().pagina.error()).not.toBe('');
  });

  it('al guardar desde el formulario recarga y avisa; al cancelar no hace nada', async () => {
    const { pagina, modales, toasts } = crear();
    modales.rolAlCerrar = 'cancel';
    await pagina.abrirFormulario();
    expect(api.consultar).toHaveBeenCalledTimes(1);

    modales.rolAlCerrar = 'guardado';
    await pagina.abrirFormulario(casa);
    expect(modales.creados.at(-1)).toMatchObject({ componentProps: { direccion: casa } });
    expect(api.consultar).toHaveBeenCalledTimes(2);
    expect(toasts.mensajes).toContain('Dirección guardada correctamente.');
  });

  it('eliminar pide confirmación y después recarga', async () => {
    api.eliminar.mockReturnValue(of(undefined));
    const { pagina, alertas, toasts } = crear();
    await pagina.confirmarEliminar(casa);
    expect(api.eliminar).not.toHaveBeenCalled();
    alertas.pulsar('Eliminar');
    expect(api.eliminar).toHaveBeenCalledWith('d1');
    expect(api.consultar).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    expect(toasts.mensajes).toContain('Dirección eliminada correctamente.');
  });

  it('si no se puede eliminar lo avisa como error', async () => {
    api.eliminar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Está en uso.' } })));
    const { pagina, alertas, toasts } = crear();
    await pagina.confirmarEliminar(casa);
    alertas.pulsar('Eliminar');
    await Promise.resolve();
    expect(toasts.mensajes.at(-1)).toBeTruthy();
    expect(api.consultar).toHaveBeenCalledTimes(1);
  });
});
