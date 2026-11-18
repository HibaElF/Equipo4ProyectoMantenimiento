package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import es.uclm.esibuy.backend.model.Producto;

// Oferta de producto: el cliente premium suma el descuento normal y el premium del producto.
class PrecioProductoTests {

    @ParameterizedTest
    @CsvSource({
        // precio, descuento, descuento premium, cliente premium, descuento aplicado, precio final
        "100.0, 10, 15, true, 25, 75.0",
        "100.0, 10, 15, false, 10, 90.0",
        "100.0, 20, 10, true, 30, 70.0",
        "100.0, 10, 0, true, 10, 90.0",
        "100.0, 0, 25, true, 25, 75.0",
        "100.0, 0, 25, false, 0, 100.0",
        "19.99, 10, 20, true, 30, 13.99"
    })
    void elClientePremiumSumaElDescuentoNormalYElPremium(
            double precio, int descuento, int descuentoPremium, boolean premium,
            int descuentoEsperado, double precioEsperado) {
        Producto producto = producto(precio, descuento, descuentoPremium);

        assertEquals(descuentoEsperado, PrecioProducto.descuentoAplicable(producto, premium));
        assertEquals(precioEsperado, PrecioProducto.paraCliente(producto, premium));
    }

    @Test
    void elClientePremiumNoPagaNuncaMasQueUnClienteNormal() {
        Producto producto = producto(100.0, 20, 10);

        assertTrue(PrecioProducto.paraCliente(producto, true) <= PrecioProducto.paraCliente(producto, false));
    }

    @Test
    void elDescuentoTotalNoPasaDelCienEnProductosAntiguos() {
        // Antes no se validaba la suma: un producto guardado con 60 % + 50 % no da un precio negativo.
        Producto producto = producto(100.0, 60, 50);

        assertEquals(100, PrecioProducto.descuentoAplicable(producto, true));
        assertEquals(0.0, PrecioProducto.paraCliente(producto, true));
    }

    @Test
    void sinPrecioNoHayPrecioFinal() {
        assertNull(PrecioProducto.paraCliente(producto(null, 10, 15), true));
    }

    private static Producto producto(Double precio, int descuento, int descuentoPremium) {
        Producto producto = new Producto();
        producto.setPrecio(precio);
        producto.setDescuento(descuento);
        producto.setDescuentoPremium(descuentoPremium);
        return producto;
    }
}
