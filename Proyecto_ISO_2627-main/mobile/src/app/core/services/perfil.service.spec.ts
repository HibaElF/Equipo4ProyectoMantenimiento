import { HttpErrorResponse } from '@angular/common/http';
import { inicialPerfil, secretoTotp } from '../models/perfil';
import { mensajeErrorPerfil } from './perfil.service';

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
