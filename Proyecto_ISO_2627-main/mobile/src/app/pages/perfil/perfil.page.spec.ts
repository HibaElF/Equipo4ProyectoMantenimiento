import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { PerfilService } from '../../core/services/perfil.service';
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
