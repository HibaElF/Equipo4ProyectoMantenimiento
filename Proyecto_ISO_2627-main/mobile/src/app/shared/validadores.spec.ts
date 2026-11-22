import { FormControl, FormGroup } from '@angular/forms';
import {
  coincidenValidator,
  contrasenaSeguraValidator,
  estadoRequisitos,
  fechaMaximaMayorDeEdad,
  mayorDeEdadValidator,
  mensajeErrorApi
} from './validadores';

describe('validadores', () => {
  it('acepta una contraseña que cumple todos los requisitos', () => {
    expect(contrasenaSeguraValidator(new FormControl('Segura#2026'))).toBeNull();
  });

  it('rechaza una contraseña sin símbolo y marca el requisito pendiente', () => {
    expect(contrasenaSeguraValidator(new FormControl('Segura2026'))).toEqual({ contrasenaDebil: true });
    const pendientes = estadoRequisitos('Segura2026').filter((r) => !r.cumplido);
    expect(pendientes.length).toBe(1);
  });

  it('detecta contraseñas que no coinciden', () => {
    const grupo = new FormGroup(
      { a: new FormControl('Uno#1234'), b: new FormControl('Otro#1234') },
      { validators: coincidenValidator('a', 'b') }
    );
    expect(grupo.hasError('noCoinciden')).toBe(true);
  });

  it('calcula la fecha máxima para tener 18 años', () => {
    expect(fechaMaximaMayorDeEdad(new Date(2026, 10, 22))).toBe('2008-11-22');
  });

  it('rechaza a menores de edad', () => {
    expect(mayorDeEdadValidator(new FormControl('2015-01-01'))).toEqual({ menorDeEdad: true });
    expect(mayorDeEdadValidator(new FormControl('1990-01-01'))).toBeNull();
  });

  it('extrae el mensaje de error de la API', () => {
    expect(mensajeErrorApi({ error: 'Correo ya registrado' }, 'x')).toBe('Correo ya registrado');
    expect(mensajeErrorApi({ errores: { dniNif: ['DNI no válido'] } }, 'x')).toBe('DNI no válido');
    expect(mensajeErrorApi(null, 'Por defecto')).toBe('Por defecto');
  });
});
