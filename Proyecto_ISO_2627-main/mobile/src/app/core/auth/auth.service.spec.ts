import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { Carrito } from '../models/carrito';
import { AlertasEstadoService } from '../services/alertas-estado.service';
import { CarritoEstadoService } from '../services/carrito-estado.service';
import { AuthService } from './auth.service';
import { RecuperacionContrasenaService } from './recuperacion-contrasena.service';
import { RegistroService } from './registro.service';

const api = environment.apiUrl;

describe('AuthService', () => {
  let http: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  /** Responde al token CSRF y devuelve la petición real. */
  function conCsrf(metodo: string, ruta: string) {
    const csrf = http.expectOne(`${api}/usuarios/csrf`);
    expect(csrf.request.withCredentials).toBe(true);
    csrf.flush({ token: 'tok-123' });
    const req = http.expectOne((r) => r.url === `${api}${ruta}` && r.method === metodo);
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('tok-123');
    expect(req.request.withCredentials).toBe(true);
    return req;
  }

  it('inicia sesión enviando el token CSRF, como la web', () => {
    let rol = '';
    auth.iniciarSesion('ana@x.es', 'Clave1234!').subscribe((r) => (rol = r.role));
    const req = conCsrf('POST', '/usuarios/login');
    expect(req.request.body).toEqual({ email: 'ana@x.es', password: 'Clave1234!' });
    req.flush({ role: 'CLIENTE' });
    expect(rol).toBe('CLIENTE');
  });

  it('verifica el segundo y el tercer factor y reenvía el código por correo', () => {
    auth.verificarSegundoFactor('123456').subscribe();
    expect(conCsrf('POST', '/usuarios/login/2fa').request.body).toEqual({ code: '123456' });
    auth.verificarTercerFactor('654321').subscribe();
    expect(conCsrf('POST', '/usuarios/login/3fa/verificar').request.body).toEqual({ code: '654321' });
    auth.reenviarTercerFactor().subscribe();
    expect(conCsrf('POST', '/usuarios/login/3fa/reenviar').request.body).toEqual({});
  });

  it('consulta la sesión actual con la cookie', () => {
    auth.obtenerSesionActual().subscribe();
    const req = http.expectOne(`${api}/usuarios/sesion-actual`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ role: 'CLIENTE' });
  });

  it('al cerrar sesión olvida el carrito aunque el servidor falle', () => {
    const carrito = TestBed.inject(CarritoEstadoService);
    carrito.actualizar({ productos: [{ cantidad: 3 }] } as unknown as Carrito);
    expect(carrito.unidades()).toBe(3);
    auth.cerrarSesion().subscribe({ error: () => undefined });
    conCsrf('POST', '/usuarios/logout').flush(null, { status: 500, statusText: 'Error' });
    expect(carrito.unidades()).toBe(0);
  });

  it('al cerrar sesión pone a cero el contador de alertas', () => {
    const alertas = TestBed.inject(AlertasEstadoService);
    alertas.noLeidas.set(5);
    auth.cerrarSesion().subscribe();
    conCsrf('POST', '/usuarios/logout').flush(null);
    expect(alertas.noLeidas()).toBe(0);
  });

  it('PUT y DELETE también llevan el token y el cuerpo', () => {
    auth.peticionConCsrf('PUT', '/usuarios/perfil', { nombre: 'Ana' }).subscribe();
    expect(conCsrf('PUT', '/usuarios/perfil').request.body).toEqual({ nombre: 'Ana' });
    auth.peticionConCsrf('DELETE', '/cliente/cuenta').subscribe();
    expect(conCsrf('DELETE', '/cliente/cuenta').request.body).toBeNull();
  });

  it('recuperar contraseña: solicitar y confirmar', () => {
    const recuperar = TestBed.inject(RecuperacionContrasenaService);
    recuperar.solicitar('ana@x.es').subscribe();
    expect(conCsrf('POST', '/usuarios/recuperar-contrasena').request.body).toEqual({ email: 'ana@x.es' });
    recuperar.confirmar('t0k', 'Nueva1234!').subscribe();
    expect(conCsrf('POST', '/usuarios/recuperar-contrasena/confirmar').request.body).toEqual({
      token: 't0k',
      nuevaContrasena: 'Nueva1234!'
    });
  });

  it('registro de cliente en /cliente/register, con token CSRF (T-10)', () => {
    const datos = {
      nombre: 'Ana', apellidos: 'Ruiz', fechaNacimiento: '2000-01-01', dniNif: '12345678Z',
      email: 'ana@x.es', contrasena: 'Clave1234!', esPremium: false, aceptaPolitica: true
    };
    TestBed.inject(RegistroService).registrarCliente(datos).subscribe();
    const req = conCsrf('POST', '/cliente/register');
    expect(req.request.body).toEqual(datos);
    req.flush({ mensaje: 'ok' });
  });
});
