import { TestBed } from '@angular/core/testing';
import { EstadoSegundoFactorService } from './estado-segundo-factor.service';

describe('EstadoSegundoFactorService', () => {
  afterEach(() => sessionStorage.clear());

  it('«Ahora no» se recuerda hasta cerrar la sesión', () => {
    const estado = TestBed.inject(EstadoSegundoFactorService);
    expect(estado.descartado()).toBe(false);
    estado.activado.set(false);
    estado.descartar();
    expect(estado.descartado()).toBe(true);
    expect(sessionStorage.getItem('esibuy.avisoSegundoFactorDescartado')).toBe('1');

    estado.reiniciar();
    expect(estado.descartado()).toBe(false);
    expect(estado.activado()).toBeNull();
    expect(sessionStorage.getItem('esibuy.avisoSegundoFactorDescartado')).toBeNull();
  });

  it('lee el descarte guardado al arrancar', () => {
    sessionStorage.setItem('esibuy.avisoSegundoFactorDescartado', '1');
    expect(TestBed.inject(EstadoSegundoFactorService).descartado()).toBe(true);
  });
});
