import {
  cumpleLuhn,
  errorCaducidad,
  errorCvv,
  errorNumeroTarjeta,
  errorTelefonoBizum,
  errorTitular,
  formatearCaducidad,
  formatearNumeroTarjeta
} from './validadores-pago';

describe('validadores de pago (mismas reglas que el backend)', () => {
  it('comprueba el número de tarjeta con Luhn', () => {
    expect(cumpleLuhn('4242424242424242')).toBe(true);
    expect(errorNumeroTarjeta('4242 4242 4242 4242')).toBe('');
    expect(errorNumeroTarjeta('4242 4242 4242 4241')).toBe('El número de tarjeta no es válido.');
    expect(errorNumeroTarjeta('')).toBe('El número de tarjeta es obligatorio.');
  });

  it('rechaza tarjetas caducadas y formatos incorrectos', () => {
    const hoy = new Date(2026, 10, 22);
    expect(errorCaducidad('11/26', hoy)).toBe('');
    expect(errorCaducidad('10/26', hoy)).toBe('La tarjeta está caducada.');
    expect(errorCaducidad('13/30', hoy)).toBe('La caducidad debe tener el formato MM/AA.');
  });

  it('valida CVV, titular y teléfono de Bizum', () => {
    expect(errorCvv('123')).toBe('');
    expect(errorCvv('12')).toBe('El código de seguridad debe tener 3 o 4 dígitos.');
    expect(errorTitular('Ana García')).toBe('');
    expect(errorTitular('1234')).not.toBe('');
    expect(errorTelefonoBizum('+34 612 345 678')).toBe('');
    expect(errorTelefonoBizum('912345678')).toBe('El teléfono de Bizum no es válido.');
  });

  it('da formato mientras se escribe', () => {
    expect(formatearNumeroTarjeta('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatearCaducidad('1229')).toBe('12/29');
  });
});
