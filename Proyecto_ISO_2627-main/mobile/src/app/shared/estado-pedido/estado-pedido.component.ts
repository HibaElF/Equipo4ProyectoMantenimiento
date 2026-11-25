import { Component, computed, input } from '@angular/core';
import { EstadoPedido, textoEstadoPedido } from '../../core/models/pedido';

/** Etiqueta de color con el estado del pedido. */
@Component({
  selector: 'app-estado-pedido',
  template: `<span class="estado" [class]="'estado ' + clase()">{{ texto() }}</span>`,
  styles: `
    .estado {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .en-proceso { background: #eef1f3; color: #3d5360; }
    .pagado { background: #fff2cd; color: #6b4a00; }
    .enviado { background: #e3eefb; color: #1b4f8a; }
    .finalizado { background: #e8f2ed; color: #255b4d; }
    .cancelado { background: #fde7e3; color: #a63120; }
  `
})
export class EstadoPedidoComponent {
  readonly estado = input.required<EstadoPedido>();
  readonly texto = computed(() => textoEstadoPedido(this.estado()));
  readonly clase = computed(
    () =>
      ({
        EN_PROCESO: 'en-proceso',
        PAGADO_COMPLETADO: 'pagado',
        TRAMITADO_ENVIADO: 'enviado',
        FINALIZADO: 'finalizado',
        CANCELADO: 'cancelado'
      })[this.estado()]
  );
}
