package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.VendedorDAO;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.Vendedor;

// PBI 276: estadísticas de ventas del vendedor (Top 10 más y menos vendidos).
@ExtendWith(MockitoExtension.class)
class EstadisticasVendedorServiceTests {

    private static final String EMAIL = "vendedor@test.com";
    private static final String TIENDA = "Mi Tienda";
    private static final String VENDEDOR_ID = "vendedor-1";

    @Mock
    private VendedorDAO vendedorDAO;

    @Mock
    private ProductoDAO productoDAO;

    @Mock
    private PedidoDAO pedidoDAO;

    @InjectMocks
    private EstadisticasVendedorService servicio;

    private int numeroPedido;

    @BeforeEach
    void prepararVendedor() {
        lenient().when(vendedorDAO.findByEmail(EMAIL)).thenReturn(Optional.of(vendedor(true, false)));
    }

    private static Vendedor vendedor(boolean activada, boolean bloqueada) {
        Vendedor vendedor = new Vendedor();
        vendedor.setId(VENDEDOR_ID);
        vendedor.setEmail(EMAIL);
        vendedor.setNombreComercial(TIENDA);
        vendedor.setActivada(activada);
        vendedor.setBloqueada(bloqueada);
        return vendedor;
    }

    private static Producto producto(String id, String nombre) {
        Producto producto = new Producto();
        producto.setId(id);
        producto.setNombre(nombre);
        producto.setVendedor(TIENDA);
        return producto;
    }

    private static LineaPedido linea(String productoId, int cantidad) {
        return new LineaPedido(productoId, "Producto " + productoId, new BigDecimal("10.00"), cantidad,
                VENDEDOR_ID, TIENDA);
    }

    private Pedido pedido(EstadoPedido estado, LineaPedido... lineas) {
        Instant fecha = Instant.parse("2026-11-20T10:00:00Z");
        return Pedido.builder()
                .id("pedido-" + (++numeroPedido))
                .clienteId("cliente-1")
                .lineas(Arrays.asList(lineas))
                .estado(estado)
                .importe(new BigDecimal("10.00"))
                .fechaCreacion(fecha)
                .fechaPago(estado == EstadoPedido.EN_PROCESO ? null : fecha)
                .metodoPagoId("metodo-pago")
                .build();
    }

    private void catalogo(Producto... productos) {
        when(productoDAO.findByVendedor(TIENDA)).thenReturn(List.of(productos));
    }

    private void pedidos(Pedido... pedidos) {
        when(pedidoDAO.findConAlgunProducto(anyCollection())).thenReturn(List.of(pedidos));
    }

    private static List<String> nombres(List<ProductoVentasResponse> ventas) {
        return ventas.stream().map(ProductoVentasResponse::nombre).toList();
    }

    @Test
    void soloCuentanComoVentaLosPedidosFinalizados() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Teclado"));
        pedidos(
                pedido(EstadoPedido.FINALIZADO, linea("p1", 3)),
                pedido(EstadoPedido.FINALIZADO, linea("p1", 2), linea("p2", 1)),
                pedido(EstadoPedido.EN_PROCESO, linea("p1", 100)),
                pedido(EstadoPedido.PAGADO_COMPLETADO, linea("p1", 100)),
                pedido(EstadoPedido.TRAMITADO_ENVIADO, linea("p1", 100)),
                pedido(EstadoPedido.CANCELADO, linea("p2", 100)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertEquals(List.of("Auriculares", "Teclado"), nombres(respuesta.masVendidos()));
        assertEquals(5, respuesta.masVendidos().get(0).unidadesVendidas());
        assertEquals(1, respuesta.masVendidos().get(1).unidadesVendidas());
        assertEquals(TIENDA, respuesta.masVendidos().get(0).vendedor());
    }

    @Test
    void losProductosSinVentasEncabezanLosMenosVendidos() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Teclado"), producto("p3", "Funda"));
        pedidos(pedido(EstadoPedido.FINALIZADO, linea("p1", 4)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertEquals(List.of("Funda", "Teclado", "Auriculares"), nombres(respuesta.menosVendidos()));
        assertEquals(0, respuesta.menosVendidos().get(0).unidadesVendidas());
        assertEquals(List.of("Auriculares", "Funda", "Teclado"), nombres(respuesta.masVendidos()));
    }

    @Test
    void cadaRankingMuestraComoMaximoDiezProductos() {
        List<Producto> productos = new ArrayList<>();
        List<Pedido> finalizados = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            productos.add(producto("p" + i, "Producto " + String.format("%02d", i)));
            finalizados.add(pedido(EstadoPedido.FINALIZADO, linea("p" + i, i)));
        }
        catalogo(productos.toArray(Producto[]::new));
        pedidos(finalizados.toArray(Pedido[]::new));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertEquals(10, respuesta.masVendidos().size());
        assertEquals(10, respuesta.menosVendidos().size());
        assertEquals(12, respuesta.masVendidos().get(0).unidadesVendidas());
        assertEquals(1, respuesta.menosVendidos().get(0).unidadesVendidas());
        assertNull(respuesta.aviso());
    }

    @Test
    void aIgualdadDeUnidadesSeOrdenanPorNombre() {
        catalogo(producto("p1", "teclado"), producto("p2", "Auriculares"), producto("p3", "Monitor"));
        pedidos(pedido(EstadoPedido.FINALIZADO, linea("p1", 2), linea("p2", 2), linea("p3", 2)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertEquals(List.of("Auriculares", "Monitor", "teclado"), nombres(respuesta.masVendidos()));
        assertEquals(List.of("Auriculares", "Monitor", "teclado"), nombres(respuesta.menosVendidos()));
    }

    @Test
    void soloAparecenLosProductosDelVendedorDeLaSesion() {
        catalogo(producto("p1", "Auriculares"));
        pedidos(pedido(EstadoPedido.FINALIZADO, linea("p1", 2), linea("ajeno", 50)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertEquals(List.of("Auriculares"), nombres(respuesta.masVendidos()));
        assertEquals(List.of("Auriculares"), nombres(respuesta.menosVendidos()));
        verify(productoDAO).findByVendedor(TIENDA);
        verify(pedidoDAO).findConAlgunProducto(List.of("p1"));
    }

    @Test
    void sinProductosAvisaYNoConsultaLosPedidos() {
        catalogo();

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertTrue(respuesta.masVendidos().isEmpty());
        assertTrue(respuesta.menosVendidos().isEmpty());
        assertEquals(EstadisticasVendedorService.AVISO_SIN_PRODUCTOS, respuesta.aviso());
        verifyNoInteractions(pedidoDAO);
    }

    @Test
    void sinVentasFinalizadasMuestraLosProductosConCeroUnidadesYUnAviso() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Teclado"));
        pedidos(pedido(EstadoPedido.PAGADO_COMPLETADO, linea("p1", 3)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertEquals(2, respuesta.masVendidos().size());
        assertTrue(respuesta.masVendidos().stream().allMatch(venta -> venta.unidadesVendidas() == 0));
        assertEquals(EstadisticasVendedorService.AVISO_SIN_VENTAS, respuesta.aviso());
    }

    @Test
    void conMenosDeDiezProductosAvisaDeQueSeMuestraTodoElCatalogo() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Teclado"));
        pedidos(pedido(EstadoPedido.FINALIZADO, linea("p1", 1)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas(EMAIL);

        assertEquals(EstadisticasVendedorService.AVISO_POCOS_PRODUCTOS, respuesta.aviso());
    }

    @Test
    void unVendedorBloqueadoNoPuedeConsultarSusEstadisticas() {
        when(vendedorDAO.findByEmail(EMAIL)).thenReturn(Optional.of(vendedor(true, true)));

        assertThrows(AccessDeniedException.class, () -> servicio.consultarVentas(EMAIL));
        verifyNoInteractions(productoDAO, pedidoDAO);
    }

    @Test
    void unVendedorPendienteDeActivarNoPuedeConsultarSusEstadisticas() {
        when(vendedorDAO.findByEmail(EMAIL)).thenReturn(Optional.of(vendedor(false, false)));

        assertThrows(AccessDeniedException.class, () -> servicio.consultarVentas(EMAIL));
        verifyNoInteractions(productoDAO, pedidoDAO);
    }

    @Test
    void unCorreoQueNoEsDeUnVendedorNoPuedeConsultarlas() {
        when(vendedorDAO.findByEmail("otro@test.com")).thenReturn(Optional.empty());

        assertThrows(AccessDeniedException.class, () -> servicio.consultarVentas("otro@test.com"));
        assertThrows(AccessDeniedException.class, () -> servicio.consultarVentas(" "));
        verifyNoInteractions(productoDAO, pedidoDAO);
    }
}
