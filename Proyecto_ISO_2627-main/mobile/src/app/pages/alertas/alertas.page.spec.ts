import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Alerta } from '../../core/models/alerta';
import { AlertasService } from '../../core/services/alertas.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { AlertasPage } from './alertas.page';

const alerta = (id: string, leida = false): Alerta => ({
  id, tipo: 'BAJADA_PRECIO', productoId: 'p-' + id, mensaje: 'Ha bajado de precio', fecha: '2026-11-24T10:00:00', leida
});
const respuesta = (...alertas: Alerta[]) => ({ alertas, noLeidas: alertas.filter((a) => !a.leida).length });

describe('AlertasPage', () => {
  const api = { consultar: vi.fn(), marcarLeida: vi.fn(), marcarTodasLeidas: vi.fn(), borrar: vi.fn(), borrarTodas: vi.fn() };

  function crear() {
    const falsos = controladoresFalsos();
    TestBed.configureTestingModule({
      imports: [AlertasPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: AlertasService, useValue: api }, ...falsos.providers]
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const pagina = TestBed.createComponent(AlertasPage).componentInstance;
    pagina.ionViewWillEnter();
    return { pagina, navegar, ...falsos };
  }

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.consultar.mockReturnValue(of(respuesta(alerta('a1'), alerta('a2', true))));
  });

  it('carga las alertas y cuántas hay sin leer', () => {
    const { pagina } = crear();
    expect(pagina.alertas().length).toBe(2);
    expect(pagina.noLeidas()).toBe(1);
    expect(pagina.etiquetaTipo('DISPONIBILIDAD')).toBe('Disponible de nuevo');
  });

  it('al pulsar una alerta nueva la marca como leída y abre el producto', () => {
    api.marcarLeida.mockReturnValue(of(respuesta(alerta('a1', true), alerta('a2', true))));
    const { pagina, navegar } = crear();
    pagina.abrir(alerta('a1'));
    expect(api.marcarLeida).toHaveBeenCalledWith('a1');
    expect(navegar).toHaveBeenCalledWith(['/tienda/producto', 'p-a1']);
    expect(pagina.noLeidas()).toBe(0);
  });

  it('una alerta ya leída solo abre el producto', () => {
    const { pagina, navegar } = crear();
    pagina.abrir(alerta('a2', true));
    expect(api.marcarLeida).not.toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/tienda/producto', 'p-a2']);
  });

  it('marcar todas como leídas y borrar una, con su aviso', async () => {
    api.marcarTodasLeidas.mockReturnValue(of(respuesta(alerta('a1', true), alerta('a2', true))));
    api.borrar.mockReturnValue(of(respuesta(alerta('a2', true))));
    const { pagina, toasts } = crear();
    pagina.marcarTodasLeidas();
    pagina.borrar(alerta('a1'));
    expect(pagina.alertas().map((a) => a.id)).toEqual(['a2']);
    await Promise.resolve();
    expect(toasts.mensajes).toEqual(['Todas las alertas están marcadas como leídas.', 'Alerta borrada.']);
  });

  it('borrar todas pide confirmación, como la web', async () => {
    api.borrarTodas.mockReturnValue(of(respuesta()));
    const { pagina, alertas } = crear();
    await pagina.confirmarBorrarTodas();
    expect(alertas.creadas[0].message).toBe('¿Borrar todas tus alertas? No se podrán recuperar.');
    expect(api.borrarTodas).not.toHaveBeenCalled();
    alertas.pulsar('Borrar todas');
    expect(api.borrarTodas).toHaveBeenCalled();
    expect(pagina.alertas()).toEqual([]);
  });

  it('si la alerta ya no existe avisa y recarga la lista', async () => {
    api.marcarLeida.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const { pagina, toasts } = crear();
    pagina.marcarLeida(alerta('a1'));
    await Promise.resolve();
    expect(toasts.mensajes[0]).toBe('La alerta ya no existe. Recarga la lista.');
    expect(api.consultar).toHaveBeenCalledTimes(2);
    expect(pagina.operacion()).toBeNull();
  });

  it('error al cargar', () => {
    api.consultar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(crear().pagina.error()).toBe('No se pudo conectar con el servidor.');
  });
});
