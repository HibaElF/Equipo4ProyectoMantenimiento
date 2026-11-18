package es.uclm.esibuy.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;

import es.uclm.esibuy.backend.model.Producto;

/*
 * Precio que paga un cliente. El descuento normal se aplica a todos; el cliente premium suma además el
 * descuento premium del producto (10 % + 15 % = 25 %). El total nunca pasa del 100 %.
 */
final class PrecioProducto {

    private static final int DESCUENTO_MAXIMO = 100;

    private PrecioProducto() {
    }

    static Double paraCliente(Producto producto, boolean clientePremium) {
        return calcularPrecioFinal(producto.getPrecio(), descuentoAplicable(producto, clientePremium));
    }

    static int descuentoAplicable(Producto producto, boolean clientePremium) {
        if (!clientePremium) {
            return producto.getDescuento();
        }
        // Los productos guardados antes de validar la suma pueden superar el 100 %: se limita.
        return Math.min(DESCUENTO_MAXIMO, producto.getDescuento() + producto.getDescuentoPremium());
    }

    private static Double calcularPrecioFinal(Double precio, int descuento) {
        if (precio == null) {
            return null;
        }
        return BigDecimal.valueOf(precio)
                .multiply(BigDecimal.valueOf(100L - descuento))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
