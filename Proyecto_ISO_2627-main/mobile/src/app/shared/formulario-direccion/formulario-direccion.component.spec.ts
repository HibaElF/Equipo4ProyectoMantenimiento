import { TestBed } from '@angular/core/testing';
import { ModalController, provideIonicAngular } from '@ionic/angular';
import { of } from 'rxjs';
import { DireccionesService } from '../../core/services/direcciones.service';
import { FormularioDireccionComponent } from './formulario-direccion.component';

describe('FormularioDireccionComponent', () => {
  const agregar = vi.fn();
  const dismiss = vi.fn();

  beforeEach(() => {
    agregar.mockReset().mockImplementation((r) => of({ id: 'd9', ...r }));
    dismiss.mockReset();
    TestBed.configureTestingModule({
      imports: [FormularioDireccionComponent],
      providers: [
        provideIonicAngular({}),
        { provide: DireccionesService, useValue: { agregar } },
        { provide: ModalController, useValue: { dismiss } }
      ]
    });
  });

  it('no guarda si falta algún campo obligatorio', () => {
    const c = TestBed.createComponent(FormularioDireccionComponent).componentInstance;
    c.guardar();
    expect(agregar).not.toHaveBeenCalled();
    expect(c.errorDe('codigoPostal')).toBe('Este campo es obligatorio.');
  });

  it('guarda la dirección (portal y piso vacíos como nulos) y la devuelve', () => {
    const c = TestBed.createComponent(FormularioDireccionComponent).componentInstance;
    c.form.setValue({
      nombre: 'Casa',
      calle: 'Mayor',
      numero: '3',
      portal: '',
      piso: '',
      codigoPostal: '13001',
      ciudad: 'Ciudad Real',
      provincia: 'Ciudad Real'
    });
    c.guardar();
    expect(agregar).toHaveBeenCalledWith(expect.objectContaining({ portal: null, piso: null, codigoPostal: '13001' }));
    expect(dismiss).toHaveBeenCalledWith(expect.objectContaining({ id: 'd9' }), 'guardado');
  });

  it('acepta la dirección asignada directamente, como hace Ionic al abrir la ventana', () => {
    const fixture = TestBed.createComponent(FormularioDireccionComponent);
    // Ionic asigna componentProps como propiedades normales antes de iniciar el componente.
    fixture.componentInstance.direccion = {
      id: 'd1',
      nombre: 'Casa',
      calle: 'Mayor',
      numero: '3',
      codigoPostal: '13001',
      ciudad: 'Ciudad Real',
      provincia: 'Ciudad Real'
    };
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.calle.value).toBe('Mayor');
  });
});
