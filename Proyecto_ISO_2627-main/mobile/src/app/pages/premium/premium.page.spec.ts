import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { Perfil } from '../../core/models/perfil';
import { PagosService } from '../../core/services/pagos.service';
import { PerfilService } from '../../core/services/perfil.service';
import { PremiumPage } from './premium.page';

const perfil = (esPremium: boolean): Perfil => ({
  tipoUsuario: 'CLIENTE', nombre: 'Ana', apellidos: 'Ruiz', email: 'a@x.es', telefono: null, imagenPerfil: null,
  dniNif: null, fechaNacimiento: null, esPremium, totpActivado: false, emailOtpActivado: false
});
const metodo = (id: string) => ({ id, tipo: 'TARJETA', nombre: id, datosEnmascarados: '•••• 4242' });

describe('PremiumPage', () => {
  const api = { consultar: vi.fn(), cambiarTipoCliente: vi.fn() };
  const pagos = { consultarMetodos: vi.fn() };

  function crear(esPremium = false) {
    api.consultar.mockReturnValue(of(perfil(esPremium)));
    TestBed.configureTestingModule({
      imports: [PremiumPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: PerfilService, useValue: api },
        { provide: PagosService, useValue: pagos }
      ]
    });
    const pagina = TestBed.createComponent(PremiumPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  beforeEach(() => [api, pagos].forEach((o) => Object.values(o).forEach((f) => f.mockReset())));

  it('con un solo método de pago lo selecciona directamente', () => {
    pagos.consultarMetodos.mockReturnValue(of([metodo('m1')]));
    const pagina = crear();
    pagina.cambiarTipo();
    expect(pagina.ventanaPago()).toBe(true);
    expect(pagina.metodoSeleccionado()).toBe('m1');
  });

  it('no paga sin método de pago seleccionado', () => {
    pagos.consultarMetodos.mockReturnValue(of([metodo('m1'), metodo('m2')]));
    const pagina = crear();
    pagina.cambiarTipo();
    pagina.pagarYHacersePremium();
    expect(api.cambiarTipoCliente).not.toHaveBeenCalled();
    expect(pagina.errorPago()).toBe('Selecciona un método de pago para hacerte Premium.');
  });

  it('paga con el método elegido y pasa a Premium', () => {
    pagos.consultarMetodos.mockReturnValue(of([metodo('m1'), metodo('m2')]));
    api.cambiarTipoCliente.mockReturnValue(of(perfil(true)));
    const pagina = crear();
    pagina.cambiarTipo();
    pagina.seleccionarMetodo('m2');
    pagina.pagarYHacersePremium();
    expect(api.cambiarTipoCliente).toHaveBeenCalledWith(true, 'm2');
    expect(pagina.perfil()?.esPremium).toBe(true);
    expect(pagina.ventanaPago()).toBe(false);
  });

  it('si el pago falla, deja la ventana abierta con el error', () => {
    pagos.consultarMetodos.mockReturnValue(of([metodo('m1')]));
    api.cambiarTipoCliente.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 402, error: { error: 'Pago rechazado.' } })));
    const pagina = crear();
    pagina.cambiarTipo();
    pagina.pagarYHacersePremium();
    expect(pagina.ventanaPago()).toBe(true);
    expect(pagina.errorPago()).toBe('Pago rechazado.');
  });

  it('volver a Normal no pide método de pago', () => {
    api.cambiarTipoCliente.mockReturnValue(of(perfil(false)));
    const pagina = crear(true);
    pagina.volverANormal();
    expect(api.cambiarTipoCliente).toHaveBeenCalledWith(false, null);
    expect(pagina.perfil()?.esPremium).toBe(false);
  });
});
