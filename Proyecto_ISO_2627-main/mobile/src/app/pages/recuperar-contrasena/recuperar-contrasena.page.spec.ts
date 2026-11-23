import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { RecuperacionContrasenaService } from '../../core/auth/recuperacion-contrasena.service';
import { RecuperarContrasenaPage } from './recuperar-contrasena.page';

describe('RecuperarContrasenaPage', () => {
  const api = { solicitar: vi.fn(), confirmar: vi.fn() };
  let navegar: ReturnType<typeof vi.spyOn>;

  function crear(token?: string) {
    TestBed.configureTestingModule({
      imports: [RecuperarContrasenaPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: RecuperacionContrasenaService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } }
      ]
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    return TestBed.createComponent(RecuperarContrasenaPage).componentInstance;
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('sin token pide el correo y valida su formato', () => {
    const pagina = crear();
    expect(pagina.modoNuevaContrasena).toBe(false);
    pagina.solicitudForm.controls.email.setValue('mal');
    pagina.solicitar();
    expect(pagina.emailInvalido()).toBe(true);
    expect(api.solicitar).not.toHaveBeenCalled();
  });

  it('envía la solicitud y muestra el aviso de correo enviado', () => {
    api.solicitar.mockReturnValue(of({ message: 'ok' }));
    const pagina = crear();
    pagina.solicitudForm.controls.email.setValue(' ana@x.es ');
    pagina.solicitar();
    expect(api.solicitar).toHaveBeenCalledWith('ana@x.es');
    expect(pagina.solicitudEnviada()).toBe(true);
  });

  it('error de la solicitud según haya o no conexión', () => {
    const pagina = crear();
    pagina.solicitudForm.controls.email.setValue('ana@x.es');
    api.solicitar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    pagina.solicitar();
    expect(pagina.error()).toBe('No se pudo conectar con el servidor. Comprueba tu conexión.');
    api.solicitar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    pagina.solicitar();
    expect(pagina.error()).toBe('No se pudo procesar la solicitud. Inténtalo de nuevo más tarde.');
  });

  it('con token quita el token de la URL y cambia la contraseña', () => {
    api.confirmar.mockReturnValue(of(undefined));
    const pagina = crear('abc');
    expect(pagina.modoNuevaContrasena).toBe(true);
    expect(navegar).toHaveBeenCalled();

    pagina.nuevaForm.setValue({ nuevaContrasena: 'Nueva1234!', confirmarContrasena: 'Otra1234!' });
    pagina.cambiarContrasena();
    expect(pagina.noCoinciden()).toBe(true);
    expect(api.confirmar).not.toHaveBeenCalled();

    pagina.nuevaForm.setValue({ nuevaContrasena: 'Nueva1234!', confirmarContrasena: 'Nueva1234!' });
    pagina.cambiarContrasena();
    expect(api.confirmar).toHaveBeenCalledWith('abc', 'Nueva1234!');
    expect(pagina.contrasenaCambiada()).toBe(true);
  });

  it('enlace caducado: mensaje del servidor', () => {
    api.confirmar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { error: 'El enlace ha caducado.' } })));
    const pagina = crear('abc');
    pagina.nuevaForm.setValue({ nuevaContrasena: 'Nueva1234!', confirmarContrasena: 'Nueva1234!' });
    pagina.cambiarContrasena();
    expect(pagina.error()).toBe('El enlace ha caducado.');
  });
});
