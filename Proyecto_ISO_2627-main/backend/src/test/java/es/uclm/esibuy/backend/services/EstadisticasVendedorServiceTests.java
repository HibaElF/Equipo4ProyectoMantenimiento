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
import es.uclm.esibuy.backend.dao.ValoracionDAO;
import es.uclm.esibuy.backend.dao.VendedorDAO;
import es.uclm.esibuy.backend.dto.EstadisticasValoracionesResponse;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoValoracionResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.dto.ValoracionesCatalogoResponse;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.Valoracion;
import es.uclm.esibuy.backend.model.Vendedor;

// Estadísticas del vendedor. PBI 276: Top 10 más y menos vendidos. PBI 277: Top 10 mejor y peor valorados.
// PBI 278: valoración media de cada producto del catálogo y de la tienda.
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

    @Mock
    private ValoracionDAO valoracionDAO;

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

    // Cada puntuación la da un cliente distinto (un cliente solo puede valorar un producto una vez)
    private static List<Valoracion> valoraciones(String productoId, int... puntuaciones) {
        List<Valoracion> lista = new ArrayList<>();
        for (int i = 0; i < puntuaciones.length; i++) {
            lista.add(new Valoracion("cliente-" + i, "pedido-" + i, productoId, puntuaciones[i], null));
        }
        return lista;
    }

    @SafeVarargs
    private void valoracionesGuardadas(List<Valoracion>... grupos) {
        List<Valoracion> todas = new ArrayList<>();
        for (List<Valoracion> grupo : grupos) {
            todas.addAll(grupo);
        }
        when(valoracionDAO.findByProductoIdIn(anyCollection())).thenReturn(todas);
    }

    private static List<String> nombresValorados(List<ProductoValoracionResponse> valoraciones) {
        return valoraciones.stream().map(ProductoValoracionResponse::nombre).toList();
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
    // --- PBI 277: productos mejor y peor valorados ---

    @Test
    void calculaLaMediaYElNumeroDeValoracionesDeCadaProducto() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Webcam"), producto("p3", "Soporte"));
        valoracionesGuardadas(valoraciones("p1", 5, 5, 4), valoraciones("p2", 1, 2, 1), valoraciones("p3", 5, 4));

        EstadisticasValoracionesResponse respuesta = servicio.consultarValoraciones(EMAIL);

        // Medias redondeadas a dos decimales: 14/3 = 4.67, 9/2 = 4.5 y 4/3 = 1.33
        ProductoValoracionResponse auriculares = respuesta.mejorValorados().get(0);
        assertEquals("Auriculares", auriculares.nombre());
        assertEquals(4.67, auriculares.valoracionMedia());
        assertEquals(3, auriculares.numeroValoraciones());
        assertEquals(TIENDA, auriculares.vendedor());
        assertEquals(4.5, respuesta.mejorValorados().get(1).valoracionMedia());
        assertEquals(1.33, respuesta.peorValorados().get(0).valoracionMedia());
    }

    @Test
    void ordenaDeMejorAPeorYAlReves() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Teclado"), producto("p3", "Cargador"),
                producto("p4", "Webcam"));
        valoracionesGuardadas(valoraciones("p1", 5, 5, 4), valoraciones("p2", 4, 4, 5, 3), valoraciones("p3", 4),
                valoraciones("p4", 1, 2, 1));

        EstadisticasValoracionesResponse respuesta = servicio.consultarValoraciones(EMAIL);

        // Teclado y Cargador empatan a 4: va antes el que tiene más valoraciones
        assertEquals(List.of("Auriculares", "Teclado", "Cargador", "Webcam"),
                nombresValorados(respuesta.mejorValorados()));
        assertEquals(List.of("Webcam", "Teclado", "Cargador", "Auriculares"),
                nombresValorados(respuesta.peorValorados()));
    }

    @Test
    void losProductosSinValoracionesNoEntranEnLosRankings() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Hub USB"));
        valoracionesGuardadas(valoraciones("p1", 3));

        EstadisticasValoracionesResponse respuesta = servicio.consultarValoraciones(EMAIL);

        assertEquals(List.of("Auriculares"), nombresValorados(respuesta.mejorValorados()));
        assertEquals(List.of("Auriculares"), nombresValorados(respuesta.peorValorados()));
        assertEquals(EstadisticasVendedorService.AVISO_POCAS_VALORACIONES, respuesta.aviso());
    }

    @Test
    void cadaRankingDeValoracionesMuestraComoMaximoDiezProductos() {
        List<Producto> productos = new ArrayList<>();
        List<Valoracion> todas = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            productos.add(producto("p" + i, "Producto " + String.format("%02d", i)));
            todas.addAll(valoraciones("p" + i, 1 + i % 5));
        }
        catalogo(productos.toArray(Producto[]::new));
        valoracionesGuardadas(todas);

        EstadisticasValoracionesResponse respuesta = servicio.consultarValoraciones(EMAIL);

        assertEquals(10, respuesta.mejorValorados().size());
        assertEquals(10, respuesta.peorValorados().size());
        assertEquals(5.0, respuesta.mejorValorados().get(0).valoracionMedia());
        assertEquals(1.0, respuesta.peorValorados().get(0).valoracionMedia());
        assertNull(respuesta.aviso());
    }

    @Test
    void sinValoracionesDevuelveListasVaciasYUnAviso() {
        catalogo(producto("p1", "Auriculares"));
        valoracionesGuardadas();

        EstadisticasValoracionesResponse respuesta = servicio.consultarValoraciones(EMAIL);

        assertTrue(respuesta.mejorValorados().isEmpty());
        assertTrue(respuesta.peorValorados().isEmpty());
        assertEquals(EstadisticasVendedorService.AVISO_SIN_VALORACIONES, respuesta.aviso());
    }

    @Test
    void soloSeConsultanLasValoracionesDeSusProductos() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Teclado"));
        valoracionesGuardadas(valoraciones("p1", 4));

        servicio.consultarValoraciones(EMAIL);

        verify(productoDAO).findByVendedor(TIENDA);
        verify(valoracionDAO).findByProductoIdIn(List.of("p1", "p2"));
    }

    @Test
    void sinProductosNoConsultaLasValoraciones() {
        catalogo();

        EstadisticasValoracionesResponse respuesta = servicio.consultarValoraciones(EMAIL);

        assertTrue(respuesta.mejorValorados().isEmpty());
        assertEquals(EstadisticasVendedorService.AVISO_SIN_VALORACIONES, respuesta.aviso());
        verifyNoInteractions(valoracionDAO);
    }
    // --- PBI 278: valoración media de cada producto del catálogo ---

    @Test
    void muestraTodoElCatalogoOrdenadoPorNombreConSuMediaYSuNumeroDeValoraciones() {
        catalogo(producto("p1", "Teclado"), producto("p2", "auriculares"), producto("p3", "Hub USB"));
        valoracionesGuardadas(valoraciones("p1", 4, 4, 5, 3), valoraciones("p2", 5, 5, 4));

        ValoracionesCatalogoResponse respuesta = servicio.consultarValoracionesCatalogo(EMAIL);

        assertEquals(List.of("auriculares", "Hub USB", "Teclado"), nombresValorados(respuesta.productos()));
        ProductoValoracionResponse teclado = respuesta.productos().get(2);
        assertEquals(4.0, teclado.valoracionMedia());
        assertEquals(4, teclado.numeroValoraciones());
    }

    @Test
    void unProductoSinValoracionesSeIndicaConMediaNulaYCeroValoraciones() {
        catalogo(producto("p1", "Hub USB"));
        valoracionesGuardadas();

        ValoracionesCatalogoResponse respuesta = servicio.consultarValoracionesCatalogo(EMAIL);

        ProductoValoracionResponse hub = respuesta.productos().get(0);
        assertNull(hub.valoracionMedia());
        assertEquals(0, hub.numeroValoraciones());
        assertNull(respuesta.valoracionMediaGlobal());
        assertEquals(0, respuesta.numeroValoraciones());
    }

    @Test
    void laMediaDeLaTiendaEsLaDeTodasSusValoraciones() {
        catalogo(producto("p1", "Auriculares"), producto("p2", "Alfombrilla"), producto("p3", "Hub USB"));
        valoracionesGuardadas(valoraciones("p1", 5, 5, 4), valoraciones("p2", 1));

        ValoracionesCatalogoResponse respuesta = servicio.consultarValoracionesCatalogo(EMAIL);

        // (5 + 5 + 4 + 1) / 4 = 3.75; la media de las medias seria (4.67 + 1) / 2 = 2.83
        assertEquals(3.75, respuesta.valoracionMediaGlobal());
        assertEquals(4, respuesta.numeroValoraciones());
    }

    @Test
    void elCatalogoSoloIncluyeLosProductosDelVendedorDeLaSesion() {
        catalogo(producto("p1", "Auriculares"));
        valoracionesGuardadas(valoraciones("p1", 4));

        ValoracionesCatalogoResponse respuesta = servicio.consultarValoracionesCatalogo(EMAIL);

        assertEquals(List.of("Auriculares"), nombresValorados(respuesta.productos()));
        verify(productoDAO).findByVendedor(TIENDA);
        verify(valoracionDAO).findByProductoIdIn(List.of("p1"));
    }

    @Test
    void sinProductosElCatalogoEstaVacioYNoConsultaLasValoraciones() {
        catalogo();

        ValoracionesCatalogoResponse respuesta = servicio.consultarValoracionesCatalogo(EMAIL);

        assertTrue(respuesta.productos().isEmpty());
        assertNull(respuesta.valoracionMediaGlobal());
        verifyNoInteractions(valoracionDAO);
    }
}
