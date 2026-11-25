import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Perfil } from '../../core/models/perfil';
import { PerfilService } from '../../core/services/perfil.service';
import { MisDatosPage } from './mis-datos.page';

const perfil: Perfil = {
  tipoUsuario: 'CLIENTE', nombre: 'Ana', apellidos: 'Ruiz', email: 'ana@x.es', telefono: '600000000', imagenPerfil: null,
  dniNif: '*****678Z', fechaNacimiento: '2000-01-01', esPremium: false, totpActivado: false, emailOtpActivado: false
};

describe('MisDatosPage', () => {
  const api = { consultar: vi.fn(), modificar: vi.fn() };

  function crear() {
    api.consultar.mockReturnValue(of(perfil));
    TestBed.configureTestingModule({
      imports: [MisDatosPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: PerfilService, useValue: api }]
    });
    const pagina = TestBed.createComponent(MisDatosPage).componentInstance;
    pagina.ionViewWillEnter();
    pagina.iniciarEdicion();
    return pagina;
  }

  beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

  it('al editar deja teléfono y DNI vacíos para conservar los actuales', () => {
    const v = crear().formulario.getRawValue();
    expect(v.nombre).toBe('Ana');
    expect(v.telefono).toBe('');
    expect(v.dniNif).toBe('');
  });

  it('envía null para conservar y recorta los textos', () => {
    api.modificar.mockReturnValue(of({ ...perfil, nombre: 'Ana María' }));
    const pagina = crear();
    pagina.formulario.patchValue({ nombre: '  Ana María ' });
    pagina.guardar();
    expect(api.modificar).toHaveBeenCalledWith({
      nombre: 'Ana María', apellidos: 'Ruiz', telefono: null, imagenPerfil: null, dniNif: null, fechaNacimiento: '2000-01-01'
    });
    expect(pagina.editando()).toBe(false);
    expect(pagina.perfil()?.nombre).toBe('Ana María');
  });

  it('eliminar el teléfono envía una cadena vacía', () => {
    api.modificar.mockReturnValue(of(perfil));
    const pagina = crear();
    pagina.formulario.patchValue({ eliminarTelefono: true });
    pagina.guardar();
    expect(api.modificar.mock.calls[0][0].telefono).toBe('');
  });

  it('valida DNI, teléfono, foto HTTPS y mayoría de edad sin llamar al servidor', () => {
    const pagina = crear();
    pagina.formulario.patchValue({ dniNif: '1234', telefono: 'abc', imagenPerfil: 'http://foto.es/a.jpg', fechaNacimiento: '2020-01-01' });
    pagina.guardar();
    expect(api.modificar).not.toHaveBeenCalled();
    expect(pagina.errorFormulario()).toBe('Revisa los campos marcados antes de guardar.');
    expect(pagina.errorDe('dniNif')).toBe('El DNI/NIF debe tener 8 números y una letra.');
    expect(pagina.errorDe('telefono')).toBe('Introduce un teléfono válido o deja el campo vacío.');
    expect(pagina.errorDe('imagenPerfil')).toBe('Introduce una URL HTTPS válida.');
    expect(pagina.errorDe('fechaNacimiento')).toBe('Debes ser mayor de edad.');
  });

  it('la vista previa solo usa URLs válidas', () => {
    const pagina = crear();
    pagina.formulario.patchValue({ imagenPerfil: 'http://no.es/a.jpg' });
    expect(pagina.fotoPrevia()).toBeNull();
    pagina.formulario.patchValue({ imagenPerfil: 'https://si.es/a.jpg' });
    expect(pagina.fotoPrevia()).toBe('https://si.es/a.jpg');
  });

  it('muestra el error del servidor y sigue editando', () => {
    api.modificar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { error: 'DNI ya registrado.' } })));
    const pagina = crear();
    pagina.guardar();
    expect(pagina.errorFormulario()).toBe('DNI ya registrado.');
    expect(pagina.editando()).toBe(true);
  });
});
