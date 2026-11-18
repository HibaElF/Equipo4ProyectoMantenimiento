package es.uclm.esibuy.backend.dto;

import java.math.BigDecimal;
import java.util.List;

import es.uclm.esibuy.backend.model.Pedido;

// HU-50: resultado de pagar el carrito, con un pedido por vendedor y el total cobrado.
public record CompraResponse(List<PedidoResponse> pedidos, BigDecimal importeTotal) {
    public static CompraResponse de(List<Pedido> pedidos) {
        BigDecimal total = pedidos.stream()
                .map(Pedido::getImporte)
                .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
        return new CompraResponse(pedidos.stream().map(PedidoResponse::de).toList(), total);
    }
}
