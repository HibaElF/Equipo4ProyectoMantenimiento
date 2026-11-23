import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  const auth = {
    iniciarSesion: vi.fn(),
    verificarSegundoFactor: vi.fn(),
    verificarTercerFactor: vi.fn(),
    reenviarTercerFactor: vi.fn(),
    cerrarSesion: vi.fn()
  };
  let navegar: ReturnType<typeof vi.fn>;

  function crear(motivo: string | null = null) {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(motivo ? { motivo } : {}) } } }
      ]
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true) as unknown as ReturnType<typeof vi.fn>;
    const pagina = TestBed.createComponent(LoginPage).componentInstance;
    pagina.email = ' ana@x.es ';
    pagina.contrasena = 'Clave1234!';
    return pagina;
  }

  beforeEach(() => {
    Object.values(auth).forEach((f) => f.mockReset());
    auth.cerrarSesion.mockReturnValue(of(undefined));
  });

  it('avisos al llegar por sesión caducada o cuenta eliminada', () => {
    expect(crear('sesion-expirada').error()).toBe('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
    TestBed.resetTestingModule();
    expect(crear('cuenta-eliminada').info()).toBe('La cuenta se ha eliminado correctamente.');
  });

  it('pide correo y contraseña antes de llamar al servidor', () => {
    const pagina = crear();
    pagina.contrasena = '';
    pagina.enviar();
    expect(auth.iniciarSesion).not.toHaveBeenCalled();
    expect(pagina.error()).toBe('Introduce tu correo y tu contraseña.');
  });

  it('un cliente sin factores entra directamente en la tienda', () => {
    auth.iniciarSesion.mockReturnValue(of({ role: 'CLIENTE' }));
    const pagina = crear();
    pagina.enviar();
    expect(auth.iniciarSesion).toHaveBeenCalledWith('ana@x.es', 'Clave1234!');
    expect(navegar).toHaveBeenCalledWith('/tienda', { replaceUrl: true });
  });

  it('un vendedor no puede usar la app y se cierra su sesión', () => {
    auth.iniciarSesion.mockReturnValue(of({ role: 'VENDEDOR' }));
    const pagina = crear();
    pagina.enviar();
    expect(auth.cerrarSesion).toHaveBeenCalled();
    expect(pagina.error()).toBe('Esta aplicación es solo para clientes. Accede a la web con tu cuenta.');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('flujo completo con segundo y tercer factor', () => {
    auth.iniciarSesion.mockReturnValue(of({ role: 'CLIENTE', requiresTwoFactor: true }));
    auth.verificarSegundoFactor.mockReturnValue(
      of({ role: 'CLIENTE', requiresEmailVerification: true, emailVerificationEmailSent: true })
    );
    auth.verificarTercerFactor.mockReturnValue(of({ role: 'CLIENTE' }));
    const pagina = crear();

    pagina.enviar();
    expect(pagina.paso()).toBe('segundo-factor');

    pagina.codigo = '12';
    pagina.enviar();
    expect(auth.verificarSegundoFactor).not.toHaveBeenCalled();

    pagina.codigo = 'abcd-2345';
    pagina.enviar();
    expect(auth.verificarSegundoFactor).toHaveBeenCalledWith('ABCD2345');
    expect(pagina.paso()).toBe('tercer-factor');
    expect(pagina.info()).toBe('Introduce el código que te hemos enviado por correo.');

    pagina.codigo = ' 998877 ';
    pagina.enviar();
    expect(auth.verificarTercerFactor).toHaveBeenCalledWith('998877');
    expect(navegar).toHaveBeenCalledWith('/tienda', { replaceUrl: true });
  });

  it('reenvía el código por correo', () => {
    auth.reenviarTercerFactor.mockReturnValue(of(undefined));
    const pagina = crear();
    pagina.reenviarCodigoCorreo();
    expect(pagina.info()).toBe('Te hemos enviado un código nuevo a tu correo.');
  });

  it('errores: servidor, sin conexión y verificación caducada', () => {
    const pagina = crear();
    auth.iniciarSesion.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401, error: { error: 'Credenciales incorrectas.' } })));
    pagina.enviar();
    expect(pagina.error()).toBe('Credenciales incorrectas.');

    auth.iniciarSesion.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    pagina.enviar();
    expect(pagina.error()).toBe('No se pudo conectar con el servidor. Comprueba tu conexión.');

    pagina.paso.set('tercer-factor');
    pagina.codigo = '1';
    auth.verificarTercerFactor.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 410 })));
    pagina.enviar();
    expect(pagina.paso()).toBe('credenciales');
    expect(pagina.error()).toBe('La verificación ha caducado. Vuelve a iniciar sesión.');
  });
});
