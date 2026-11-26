import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
import { controladoresFalsos } from '../../testing/controladores-falsos';
import { PerfilPage } from './perfil.page';

describe('PerfilPage', () => {
  const api = { consultar: vi.fn(), darDeBaja: vi.fn() };
  const auth = { cerrarSesion: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [PerfilPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: PerfilService, useValue: api },
        { provide: AuthService, useValue: auth }
      ]
    });
    const pagina = TestBed.createComponent(PerfilPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  beforeEach(() => {
    [api, auth].forEach((o) => Object.values(o).forEach((f) => f.mockReset()));
    api.consultar.mockReturnValue(of({ nombre: 'Ana', apellidos: 'Ruiz', email: 'a@x.es', esPremium: true, totpActivado: false }));
    auth.cerrarSesion.mockReturnValue(of(undefined));
  });

  it('carga el perfil del servidor', () => {
    expect(crear().perfil()?.nombre).toBe('Ana');
  });

  it('tras la baja limpia la sesión y va al login con el aviso', () => {
    api.darDeBaja.mockReturnValue(of(undefined));
    const pagina = crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    pagina.darDeBaja();
    expect(auth.cerrarSesion).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'cuenta-eliminada' }, replaceUrl: true });
  });

  it('si el servidor rechaza la baja no sale de la cuenta', () => {
    api.darDeBaja.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Tienes pedidos pagados o enviados.' } }))
    );
    const pagina = crear();
    pagina.darDeBaja();
    expect(auth.cerrarSesion).not.toHaveBeenCalled();
    expect(pagina.bajaEnCurso()).toBe(false);
  });
});

describe('PerfilPage: confirmaciones', () => {
  const api = { consultar: vi.fn(), darDeBaja: vi.fn(), descargarMisDatos: vi.fn() };
  const auth = { cerrarSesion: vi.fn() };

  function crear() {
    const falsos = controladoresFalsos();
    api.consultar.mockReturnValue(of({ nombre: 'Ana', esPremium: false, totpActivado: true }));
    auth.cerrarSesion.mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      imports: [PerfilPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: PerfilService, useValue: api },
        { provide: AuthService, useValue: auth },
        ...falsos.providers
      ]
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const navegarUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    return { pagina: TestBed.createComponent(PerfilPage).componentInstance, navegarUrl, ...falsos };
  }

  beforeEach(() => [api, auth].forEach((o) => Object.values(o).forEach((f) => f.mockReset())));

  it('cerrar sesión pide confirmación y vuelve al login', async () => {
    const { pagina, alertas, navegarUrl } = crear();
    await pagina.confirmarCierreSesion();
    expect(auth.cerrarSesion).not.toHaveBeenCalled();
    alertas.pulsar('Cerrar sesión');
    expect(auth.cerrarSesion).toHaveBeenCalled();
    expect(navegarUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });

  it('la baja exige dos confirmaciones, como la web', async () => {
    api.darDeBaja.mockReturnValue(of(undefined));
    const { pagina, alertas } = crear();
    await pagina.iniciarBaja();
    expect(alertas.creadas[0].header).toBe('¿Quieres iniciar la baja?');
    await alertas.pulsar('Continuar');
    expect(api.darDeBaja).not.toHaveBeenCalled();
    expect(alertas.creadas[1].header).toBe('La eliminación es permanente');
    alertas.pulsar('Eliminar mi cuenta');
    expect(api.darDeBaja).toHaveBeenCalled();
  });

  it('descargar mis datos: lo descarga y, si se repite antes de un minuto, avisa (T-25)', async () => {
    const crearUrl = vi.fn(() => 'blob:mis-datos');
    const revocar = vi.fn();
    const urlOriginal = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL };
    URL.createObjectURL = crearUrl;
    URL.revokeObjectURL = revocar;
    const pulsar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    try {
      api.descargarMisDatos.mockReturnValue(of(new Blob(['{}'], { type: 'application/json' })));
      const { pagina, toasts } = crear();
      pagina.descargarMisDatos();
      await vi.waitFor(() => expect(pagina.descargaEnCurso()).toBe(false));
      expect(pulsar).toHaveBeenCalled();
      expect(revocar).toHaveBeenCalledWith('blob:mis-datos');

      api.descargarMisDatos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
      pagina.descargarMisDatos();
      await Promise.resolve();
      expect(toasts.mensajes.at(-1)).toBe(
        'Solo puedes descargar tus datos una vez por minuto. Inténtalo de nuevo en unos segundos.'
      );
    } finally {
      URL.createObjectURL = urlOriginal.crear;
      URL.revokeObjectURL = urlOriginal.revocar;
      pulsar.mockRestore();
    }
  });

  it('descargar mis datos con la sesión caducada lleva al login', () => {
    api.descargarMisDatos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const { pagina } = crear();
    pagina.descargarMisDatos();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], { queryParams: { motivo: 'sesion-expirada' } });
  });

  it('si el servidor rechaza la baja muestra el motivo', async () => {
    api.darDeBaja.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'Tienes pedidos en curso.' } })));
    const { pagina, toasts } = crear();
    pagina.darDeBaja();
    await Promise.resolve();
    expect(toasts.mensajes[0]).toBe('Tienes pedidos en curso.');
  });

  it('error al cargar el perfil', () => {
    api.consultar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    TestBed.configureTestingModule({
      imports: [PerfilPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: PerfilService, useValue: api }, { provide: AuthService, useValue: auth }]
    });
    const pagina = TestBed.createComponent(PerfilPage).componentInstance;
    pagina.ionViewWillEnter();
    expect(pagina.error()).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
  });
});
