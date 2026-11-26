import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { RegistroService } from '../../core/auth/registro.service';
import { RegistroPage } from './registro.page';

const validos = {
  nombre: ' Ana ', apellidos: ' Ruiz ', fechaNacimiento: '2000-01-01', dniNif: '12345678z', email: ' ana@x.es ',
  telefono: '', imagenPerfil: '', tipoCliente: 'normal' as const, contrasena: 'Clave1234!', repetirContrasena: 'Clave1234!',
  aceptaPolitica: true
};

describe('RegistroPage', () => {
  const api = { registrarCliente: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [RegistroPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: RegistroService, useValue: api }]
    });
    return TestBed.createComponent(RegistroPage).componentInstance;
  }

  beforeEach(() => api.registrarCliente.mockReset());

  it('no envía un formulario vacío y marca los errores', () => {
    const pagina = crear();
    pagina.registrar();
    expect(api.registrarCliente).not.toHaveBeenCalled();
    expect(pagina.error()).toBe('Revisa los campos marcados.');
    expect(pagina.errorDe('nombre')).toBe('Este campo es obligatorio.');
  });

  it('mensajes de cada validación', () => {
    const pagina = crear();
    pagina.form.patchValue({
      email: 'no-es-correo', fechaNacimiento: '2020-01-01', dniNif: '123', telefono: 'abc', imagenPerfil: 'ftp://x',
      contrasena: 'debil', repetirContrasena: 'otra'
    });
    pagina.form.markAllAsTouched();
    expect(pagina.errorDe('email')).toBe('Introduce un correo electrónico válido.');
    expect(pagina.errorDe('fechaNacimiento')).toBe('Debes tener al menos 18 años.');
    expect(pagina.errorDe('dniNif')).toBe('El DNI/NIF debe tener 8 números y una letra.');
    expect(pagina.errorDe('telefono')).toBe('Introduce un teléfono válido o deja el campo vacío.');
    expect(pagina.errorDe('imagenPerfil')).toBe('Introduce una URL que empiece por https:// (máximo 1000 caracteres).');
    expect(pagina.errorDe('contrasena')).toBe('La contraseña debe cumplir todos los requisitos.');
    expect(pagina.errorDe('repetirContrasena')).toBe('Las contraseñas no coinciden.');
    expect(pagina.requisitos().some((r) => !r.cumplido)).toBe(true);
  });

  it('envía los datos limpios, sin teléfono ni foto si están vacíos', () => {
    api.registrarCliente.mockReturnValue(of({ mensaje: 'Revisa tu correo para activar la cuenta.' }));
    const pagina = crear();
    pagina.form.setValue({ ...validos, tipoCliente: 'premium' });
    pagina.registrar();
    expect(api.registrarCliente).toHaveBeenCalledWith({
      nombre: 'Ana', apellidos: 'Ruiz', fechaNacimiento: '2000-01-01', dniNif: '12345678Z', email: 'ana@x.es',
      contrasena: 'Clave1234!', esPremium: true, aceptaPolitica: true
    });
    expect(pagina.exito()).toBe('Revisa tu correo para activar la cuenta.');
    expect(pagina.form.controls.nombre.value).toBe('');
  });

  it('exige aceptar la política de privacidad (T-24)', () => {
    const pagina = crear();
    pagina.form.setValue({ ...validos, aceptaPolitica: false });
    expect(pagina.errorConsentimiento()).toBe('');
    pagina.registrar();
    expect(api.registrarCliente).not.toHaveBeenCalled();
    expect(pagina.errorConsentimiento()).toBe('Debes aceptar la política de privacidad para registrarte.');
  });

  it('mismas longitudes máximas que el servidor y foto solo por https', () => {
    const pagina = crear();
    pagina.form.patchValue({ nombre: 'a'.repeat(101), imagenPerfil: 'http://x.es/a.jpg', telefono: '600\t123 456' });
    pagina.form.markAllAsTouched();
    expect(pagina.errorDe('nombre')).toBe('Has superado la longitud máxima permitida.');
    expect(pagina.errorDe('imagenPerfil')).toBe('Introduce una URL que empiece por https:// (máximo 1000 caracteres).');
    expect(pagina.errorDe('telefono')).toBe('Introduce un teléfono válido o deja el campo vacío.');
  });

  it('vista previa: la URL escrita o el avatar por defecto', () => {
    const pagina = crear();
    expect(pagina.fotoPerfil()).toBe(pagina.avatarPorDefecto);
    pagina.form.controls.imagenPerfil.setValue('https://x.es/a.jpg');
    expect(pagina.fotoPerfil()).toBe('https://x.es/a.jpg');
    pagina.fotoFallida.set(true);
    expect(pagina.fotoPerfil()).toBe(pagina.avatarPorDefecto);
  });

  it('muestra el error del servidor o de conexión', () => {
    const pagina = crear();
    pagina.form.setValue(validos);
    api.registrarCliente.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { error: 'El correo ya está registrado.' } })));
    pagina.registrar();
    expect(pagina.error()).toBe('El correo ya está registrado.');
    api.registrarCliente.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    pagina.registrar();
    expect(pagina.error()).toBe('No se pudo conectar con el servidor. Comprueba tu conexión.');
  });
});
