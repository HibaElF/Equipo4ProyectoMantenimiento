import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { AlertasEstadoService } from '../../core/services/alertas-estado.service';
import { CarritoEstadoService } from '../../core/services/carrito-estado.service';
import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  const unidades = signal(0);
  const estado = { unidades, refrescar: vi.fn() };
  const alertas = { refrescar: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: CarritoEstadoService, useValue: estado },
        { provide: AlertasEstadoService, useValue: alertas }
      ]
    });
    return TestBed.createComponent(TabsPage).componentInstance;
  }

  it('cinco pestañas y pide el carrito al empezar', () => {
    const pagina = crear();
    expect(pagina.pestanas.map((p) => p.texto)).toEqual(['Tienda', 'Listas', 'Carrito', 'Pedidos', 'Perfil']);
    expect(estado.refrescar).toHaveBeenCalled();
  });

  it('el lector de pantalla dice cuántas unidades hay en el carrito', () => {
    const pagina = crear();
    const carrito = pagina.pestanas[2];
    unidades.set(0);
    expect(pagina.etiqueta(carrito)).toBe('Carrito');
    unidades.set(1);
    expect(pagina.etiqueta(carrito)).toBe('Carrito, 1 unidad');
    unidades.set(4);
    expect(pagina.etiqueta(carrito)).toBe('Carrito, 4 unidades');
    expect(pagina.etiqueta(pagina.pestanas[0])).toBe('Tienda');
  });

  it('recuerda la pestaña activa para rellenar su icono', () => {
    const pagina = crear();
    pagina.cambio({ tab: 'perfil' });
    expect(pagina.activa()).toBe('perfil');
  });

  it('pide las alertas al abrir la app y al cambiar de pestaña', () => {
    alertas.refrescar.mockClear();
    const pagina = crear();
    expect(alertas.refrescar).toHaveBeenCalledWith(true);
    pagina.cambio({ tab: 'pedidos' });
    expect(alertas.refrescar).toHaveBeenLastCalledWith();
  });
});
