package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;

// Estadísticas globales del administrador. PBI 279: Top 10 más y menos vendidos de todas las tiendas.
@ExtendWith(MockitoExtension.class)
class EstadisticasAdministradorServiceTests {

    private static final String TIENDA_A = "Tienda A";
    private static final String TIENDA_B = "Tienda B";

    @Mock
    private ProductoDAO productoDAO;

    @Mock
    private PedidoDAO pedidoDAO;

    @InjectMocks
    private EstadisticasAdministradorService servicio;

    private int numeroPedido;

    private static Producto producto(String id, String nombre, String tienda) {
        Producto producto = new Producto();
        producto.setId(id);
        producto.setNombre(nombre);
        producto.setVendedor(tienda);
        return producto;
    }

    private static LineaPedido linea(String productoId, int cantidad, String tienda) {
        return new LineaPedido(productoId, "Producto " + productoId, new BigDecimal("10.00"), cantidad,
                "id-" + tienda, tienda);
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

    private void productos(Producto... productos) {
        when(productoDAO.findAll()).thenReturn(List.of(productos));
    }

    private void finalizados(Pedido... pedidos) {
        when(pedidoDAO.findByEstado(EstadoPedido.FINALIZADO)).thenReturn(List.of(pedidos));
    }

    private static List<String> nombres(List<ProductoVentasResponse> ventas) {
        return ventas.stream().map(ProductoVentasResponse::nombre).toList();
    }

    // --- PBI 279: productos más y menos vendidos de todas las tiendas ---

    @Test
    void sumaLasVentasDeTodasLasTiendasConSuVendedor() {
        productos(producto("p1", "Auriculares", TIENDA_A), producto("p2", "Mochila", TIENDA_B));
        finalizados(
                pedido(EstadoPedido.FINALIZADO, linea("p1", 3, TIENDA_A)),
                pedido(EstadoPedido.FINALIZADO, linea("p2", 5, TIENDA_B)),
                pedido(EstadoPedido.FINALIZADO, linea("p1", 4, TIENDA_A)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas();

        assertEquals(List.of("Auriculares", "Mochila"), nombres(respuesta.masVendidos()));
        assertEquals(7, respuesta.masVendidos().get(0).unidadesVendidas());
        assertEquals(TIENDA_A, respuesta.masVendidos().get(0).vendedor());
        assertEquals(TIENDA_B, respuesta.masVendidos().get(1).vendedor());
    }

    @Test
    void soloConsultaLosPedidosFinalizados() {
        productos(producto("p1", "Auriculares", TIENDA_A));
        finalizados(
                pedido(EstadoPedido.FINALIZADO, linea("p1", 2, TIENDA_A)),
                // Aunque la consulta ya filtra, el cálculo tampoco cuenta otro estado
                pedido(EstadoPedido.CANCELADO, linea("p1", 100, TIENDA_A)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas();

        assertEquals(2, respuesta.masVendidos().get(0).unidadesVendidas());
        verify(pedidoDAO).findByEstado(EstadoPedido.FINALIZADO);
        verifyNoMoreInteractions(pedidoDAO);
    }

    @Test
    void losProductosSinVentasDeCualquierTiendaEncabezanLosMenosVendidos() {
        productos(producto("p1", "Auriculares", TIENDA_A), producto("p2", "Llavero", TIENDA_B),
                producto("p3", "Paraguas", TIENDA_B));
        finalizados(pedido(EstadoPedido.FINALIZADO, linea("p1", 3, TIENDA_A)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas();

        assertEquals(List.of("Llavero", "Paraguas", "Auriculares"), nombres(respuesta.menosVendidos()));
        assertEquals(0, respuesta.menosVendidos().get(0).unidadesVendidas());
    }

    @Test
    void cadaRankingDeVentasMuestraComoMaximoDiezProductos() {
        List<Producto> catalogo = new ArrayList<>();
        List<Pedido> pedidos = new ArrayList<>();
        for (int i = 1; i <= 14; i++) {
            String tienda = i % 2 == 0 ? TIENDA_A : TIENDA_B;
            catalogo.add(producto("p" + i, "Producto " + String.format("%02d", i), tienda));
            pedidos.add(pedido(EstadoPedido.FINALIZADO, linea("p" + i, i, tienda)));
        }
        productos(catalogo.toArray(Producto[]::new));
        finalizados(pedidos.toArray(Pedido[]::new));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas();

        assertEquals(10, respuesta.masVendidos().size());
        assertEquals(10, respuesta.menosVendidos().size());
        assertEquals(14, respuesta.masVendidos().get(0).unidadesVendidas());
        assertEquals(1, respuesta.menosVendidos().get(0).unidadesVendidas());
        assertNull(respuesta.aviso());
    }

    @Test
    void sinProductosAvisa() {
        productos();
        finalizados();

        EstadisticasVentasResponse respuesta = servicio.consultarVentas();

        assertTrue(respuesta.masVendidos().isEmpty());
        assertEquals(EstadisticasAdministradorService.AVISO_SIN_PRODUCTOS, respuesta.aviso());
    }

    @Test
    void sinVentasFinalizadasAvisaYMuestraLosProductosConCeroUnidades() {
        productos(producto("p1", "Auriculares", TIENDA_A));
        finalizados();

        EstadisticasVentasResponse respuesta = servicio.consultarVentas();

        assertEquals(0, respuesta.masVendidos().get(0).unidadesVendidas());
        assertEquals(EstadisticasAdministradorService.AVISO_SIN_VENTAS, respuesta.aviso());
    }

    @Test
    void conMenosDeDiezProductosAvisaDeQueSeMuestranTodos() {
        productos(producto("p1", "Auriculares", TIENDA_A), producto("p2", "Mochila", TIENDA_B));
        finalizados(pedido(EstadoPedido.FINALIZADO, linea("p2", 1, TIENDA_B)));

        EstadisticasVentasResponse respuesta = servicio.consultarVentas();

        assertEquals(EstadisticasAdministradorService.AVISO_POCOS_PRODUCTOS, respuesta.aviso());
    }
}
