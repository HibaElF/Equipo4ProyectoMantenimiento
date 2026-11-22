import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { PedidoCliente } from '../../core/models/pedido';
import { PedidosService } from '../../core/services/pedidos.service';
import { PedidosPage } from './pedidos.page';

const p = (id: string, estado: PedidoCliente['estado']): PedidoCliente => ({
  id, lineas: [], estado, importe: 1, fechaCreacion: '', fechaPago: null, direccionEnvio: null, historialEstados: []
});

describe('PedidosPage', () => {
  function crear(historico = of([p('h1', 'FINALIZADO')])) {
    TestBed.configureTestingModule({
      imports: [PedidosPage],
      providers: [
        provideRouter([]),
        provideIonicAngular({}),
        { provide: PedidosService, useValue: { consultarActivos: () => of([p('a1', 'EN_PROCESO')]), consultarHistorico: () => historico } }
      ]
    });
    const pagina = TestBed.createComponent(PedidosPage).componentInstance;
    pagina.ionViewWillEnter();
    return pagina;
  }

  it('separa los pedidos activos del historial', () => {
    const pagina = crear();
    expect(pagina.pedidos().map((x) => x.id)).toEqual(['a1']);
    pagina.vista.set('historico');
    expect(pagina.pedidos().map((x) => x.id)).toEqual(['h1']);
  });

  it('un error en el historial no afecta a los activos', () => {
    const pagina = crear(throwError(() => new HttpErrorResponse({ status: 0 })));
    expect(pagina.error()).toBe('');
    pagina.vista.set('historico');
    expect(pagina.error()).toBe('No se puede conectar con el servidor.');
  });
});
