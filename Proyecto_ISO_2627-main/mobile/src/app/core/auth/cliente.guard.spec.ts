import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { clienteGuard } from './cliente.guard';

describe('clienteGuard', () => {
  const auth = { obtenerSesionActual: vi.fn() };

  function ejecutar(): Promise<boolean | UrlTree> {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    const resultado = TestBed.runInInjectionContext(() =>
      clienteGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    ) as Observable<boolean | UrlTree>;
    return firstValueFrom(resultado);
  }

  it('deja pasar a un cliente', async () => {
    auth.obtenerSesionActual.mockReturnValue(of({ role: 'CLIENTE' }));
    expect(await ejecutar()).toBe(true);
  });

  it('un vendedor o administrador vuelve al login (la app es solo para clientes)', async () => {
    auth.obtenerSesionActual.mockReturnValue(of({ role: 'VENDEDOR' }));
    expect(String(await ejecutar())).toBe('/login');
  });

  it('sin sesión vuelve al login', async () => {
    auth.obtenerSesionActual.mockReturnValue(throwError(() => new Error('401')));
    expect(String(await ejecutar())).toBe('/login');
  });
});
