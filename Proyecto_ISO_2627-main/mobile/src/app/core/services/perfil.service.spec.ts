import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { inicialPerfil, secretoTotp } from '../models/perfil';
import { PerfilService, mensajeErrorPerfil } from './perfil.service';

const err = (status: number, error: unknown = null) => new HttpErrorResponse({ status, error });

describe('perfil: utilidades', () => {
  it('mensajes de error como en la web', () => {
    expect(mensajeErrorPerfil(err(401), 'x')).toBe('Tu sesión ya no es válida. Vuelve a iniciar sesión.');
    expect(mensajeErrorPerfil(err(403), 'x')).toBe('No tienes permiso para modificar este perfil.');
    expect(mensajeErrorPerfil(err(0), 'x')).toBe('No se pudo conectar con el servicio. Inténtalo de nuevo.');
    expect(mensajeErrorPerfil(err(500, { error: 'NullPointer' }), 'Genérico')).toBe('Genérico');
    expect(mensajeErrorPerfil(err(409, { error: 'Tienes pedidos pagados.' }), 'x')).toBe('Tienes pedidos pagados.');
    expect(mensajeErrorPerfil(err(400, { errores: { telefono: ['Teléfono no válido.'] } }), 'x')).toBe('Teléfono no válido.');
    expect(mensajeErrorPerfil(err(400, { message: 'Otro' }), 'x')).toBe('Otro');
    expect(mensajeErrorPerfil(err(400), 'Genérico')).toBe('Genérico');
  });

  it('inicial en mayúscula', () => {
    expect(inicialPerfil(' álvaro')).toBe('Á');
    expect(inicialPerfil(null)).toBe('');
  });

  it('extrae la clave secreta de la URI otpauth en grupos de 4', () => {
    expect(secretoTotp('otpauth://totp/ESIBuy:a@b.es?secret=JBSWY3DPEHPK3PXP&issuer=ESIBuy')).toBe('JBSW Y3DP EHPK 3PXP');
    expect(secretoTotp(null)).toBeNull();
    expect(secretoTotp('otpauth://totp/x')).toBeNull();
  });
});

describe('PerfilService: contraseña y mis datos', () => {
  const api = environment.apiUrl;
  let servicio: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('cambia la contraseña con su token CSRF (T-05)', () => {
    servicio.cambiarContrasena('Actual1234!', 'Nueva1234!').subscribe();
    http.expectOne(`${api}/usuarios/csrf`).flush({ token: 't' });
    const peticion = http.expectOne(`${api}/usuarios/contrasena`);
    expect(peticion.request.method).toBe('PUT');
    expect(peticion.request.headers.get('X-XSRF-TOKEN')).toBe('t');
    expect(peticion.request.body).toEqual({ contrasenaActual: 'Actual1234!', nuevaContrasena: 'Nueva1234!' });
    peticion.flush(null);
  });

  it('descarga mis datos como archivo, con la cookie de sesión (T-25)', () => {
    servicio.descargarMisDatos().subscribe((datos) => expect(datos).toBeInstanceOf(Blob));
    const peticion = http.expectOne(`${api}/usuarios/mis-datos`);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.withCredentials).toBe(true);
    expect(peticion.request.responseType).toBe('blob');
    peticion.flush(new Blob(['{}']));
  });
});
