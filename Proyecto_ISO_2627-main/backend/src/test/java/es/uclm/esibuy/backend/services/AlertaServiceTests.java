package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import es.uclm.esibuy.backend.dao.AlertaDAO;
import es.uclm.esibuy.backend.dao.ListaProductosDAO;
import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.dto.AlertasResponse;
import es.uclm.esibuy.backend.exceptions.AlertaNoEncontradaException;
import es.uclm.esibuy.backend.model.Alerta;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.ListaProductos;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.TipoAlerta;
import es.uclm.esibuy.backend.model.Usuario;
import es.uclm.esibuy.backend.model.Vendedor;

@ExtendWith(MockitoExtension.class)
class AlertaServiceTests {

    private static final String PRODUCTO_ID = "producto-1";

    @Mock
    private AlertaDAO alertaDAO;

    @Mock
    private ListaProductosDAO listaProductosDAO;

    @Mock
    private UsuarioDAO usuarioDAO;

    @Mock
    private ProductoDAO productoDAO;

    @Mock
    private PedidoDAO pedidoDAO;

    @InjectMocks
    private AlertaService alertaService;

    private static Producto producto(double precio, int descuento) {
        Producto producto = new Producto();
        producto.setId(PRODUCTO_ID);
        producto.setNombre("Teclado");
        producto.setCategoria("Informática");
        producto.setPrecio(precio);
        producto.setDescuento(descuento);
        producto.setStock(5);
        producto.setEsVisible(true);
        return producto;
    }

    private static Cliente cliente(String id, boolean premium) {
        Cliente cliente = new Cliente();
        cliente.setId(id);
        cliente.setEsPremium(premium);
        return cliente;
    }

    private void favoritoDe(Usuario... usuarios) {
        List<String> ids = Arrays.stream(usuarios).map(Usuario::getId).toList();
        when(listaProductosDAO.findFavoritosConProducto(PRODUCTO_ID))
                .thenReturn(ids.stream().map(ListaProductos::crearFavoritos).toList());
        when(usuarioDAO.findAllById(ids)).thenReturn(List.of(usuarios));
    }

    @SuppressWarnings("unchecked")
    private List<Alerta> alertasGuardadas() {
        ArgumentCaptor<List<Alerta>> captor = ArgumentCaptor.forClass(List.class);
        verify(alertaDAO).saveAll(captor.capture());
        return captor.getValue();
    }

    @Test
    void bajadaDePrecioAvisaALosClientesQueLoTienenEnFavoritos() {
        favoritoDe(cliente("cliente-1", false), cliente("cliente-2", false));

        alertaService.avisarSiBajaPrecio(producto(15.0, 0), 20.0);

        List<Alerta> alertas = alertasGuardadas();
        assertEquals(2, alertas.size());
        Alerta alerta = alertas.get(0);
        assertEquals("cliente-1", alerta.getClienteId());
        assertEquals(TipoAlerta.BAJADA_PRECIO, alerta.getTipo());
        assertEquals(PRODUCTO_ID, alerta.getProductoId());
        assertEquals("«Teclado», de tus favoritos, ha bajado de 20,00 € a 15,00 €.", alerta.getMensaje());
        assertFalse(alerta.isLeida());
        assertNotNull(alerta.getFecha());
    }

    @Test
    void subirElDescuentoTambienEsUnaBajadaDePrecio() {
        favoritoDe(cliente("cliente-1", false));

        alertaService.avisarSiBajaPrecio(producto(20.0, 25), 20.0);

        assertEquals("«Teclado», de tus favoritos, ha bajado de 20,00 € a 15,00 €.",
                alertasGuardadas().get(0).getMensaje());
    }

    @Test
    void siElPrecioSubeOSeMantieneNoSeAvisa() {
        alertaService.avisarSiBajaPrecio(producto(25.0, 0), 20.0);
        alertaService.avisarSiBajaPrecio(producto(20.0, 0), 20.0);

        verifyNoInteractions(listaProductosDAO, usuarioDAO, alertaDAO);
    }

    @Test
    void unProductoDesactivadoNoAvisa() {
        Producto desactivado = producto(15.0, 0);
        desactivado.setEsVisible(false);

        alertaService.avisarSiBajaPrecio(desactivado, 20.0);

        verifyNoInteractions(listaProductosDAO, usuarioDAO, alertaDAO);
    }

    @Test
    void soloLosClientesRecibenAlertas() {
        Vendedor vendedor = new Vendedor();
        vendedor.setId("vendedor-1");
        favoritoDe(cliente("cliente-1", false), vendedor);

        alertaService.avisarSiBajaPrecio(producto(15.0, 0), 20.0);

        List<Alerta> alertas = alertasGuardadas();
        assertEquals(1, alertas.size());
        assertEquals("cliente-1", alertas.get(0).getClienteId());
    }

    @Test
    void unProductoSoloPremiumSoloAvisaALosClientesPremium() {
        Producto soloPremium = producto(15.0, 0);
        soloPremium.setSoloPremium(true);
        favoritoDe(cliente("estandar", false), cliente("premium", true));

        alertaService.avisarSiBajaPrecio(soloPremium, 20.0);

        List<Alerta> alertas = alertasGuardadas();
        assertEquals(1, alertas.size());
        assertEquals("premium", alertas.get(0).getClienteId());
    }

    @Test
    void unFavoritoQueVuelveAEstarDisponibleAvisaALosClientes() {
        favoritoDe(cliente("cliente-1", false));

        alertaService.avisarSiVuelveADisponible(producto(20.0, 0), false);

        Alerta alerta = alertasGuardadas().get(0);
        assertEquals(TipoAlerta.DISPONIBILIDAD, alerta.getTipo());
        assertEquals("«Teclado», de tus favoritos, vuelve a estar disponible.", alerta.getMensaje());
    }

    @Test
    void siYaEstabaDisponibleNoSeAvisa() {
        alertaService.avisarSiVuelveADisponible(producto(20.0, 0), true);

        verifyNoInteractions(listaProductosDAO, usuarioDAO, alertaDAO);
    }

    @Test
    void sinStockODesactivadoNoEstaDisponibleYNoSeAvisa() {
        Producto sinStock = producto(20.0, 0);
        sinStock.setStock(0);
        Producto desactivado = producto(20.0, 0);
        desactivado.setEsVisible(false);

        alertaService.avisarSiVuelveADisponible(sinStock, false);
        alertaService.avisarSiVuelveADisponible(desactivado, false);

        verifyNoInteractions(listaProductosDAO, usuarioDAO, alertaDAO);
    }

    private void otroProductoDeLaCategoria(String id) {
        Producto otro = producto(10.0, 0);
        otro.setId(id);
        when(productoDAO.findByCategoriaIgnoreCase("Informática")).thenReturn(List.of(producto(15.0, 0), otro));
    }

    private static Pedido pedidoDe(String clienteId) {
        Pedido pedido = mock(Pedido.class);
        when(pedido.getClienteId()).thenReturn(clienteId);
        return pedido;
    }

    @Test
    void unProductoNuevoSeRecomiendaAQuienTieneOHaCompradoProductosDeSuCategoria() {
        otroProductoDeLaCategoria("raton");
        ListaProductos lista = ListaProductos.crearLista("cliente-lista", "Regalos");
        when(listaProductosDAO.findConAlgunProducto(List.of("raton"))).thenReturn(List.of(lista));
        List<Pedido> pedidos = List.of(pedidoDe("cliente-pedido"), pedidoDe("cliente-lista"), pedidoDe(null));
        when(pedidoDAO.findConAlgunProducto(List.of("raton"))).thenReturn(pedidos);
        when(usuarioDAO.findAllById(Set.of("cliente-lista", "cliente-pedido")))
                .thenReturn(List.of(cliente("cliente-lista", false), cliente("cliente-pedido", false)));

        alertaService.recomendarNuevoProducto(producto(15.0, 0));

        List<Alerta> alertas = alertasGuardadas();
        assertEquals(2, alertas.size());
        assertEquals(TipoAlerta.RECOMENDACION, alertas.get(0).getTipo());
        assertEquals("Nuevo producto en Informática que te puede interesar: «Teclado».", alertas.get(0).getMensaje());
    }

    @Test
    void siNoHayOtrosProductosDeLaCategoriaNoSeRecomienda() {
        when(productoDAO.findByCategoriaIgnoreCase("Informática")).thenReturn(List.of(producto(15.0, 0)));

        alertaService.recomendarNuevoProducto(producto(15.0, 0));

        verifyNoInteractions(listaProductosDAO, pedidoDAO, usuarioDAO, alertaDAO);
    }

    @Test
    void unProductoNuevoNoDisponibleNoSeRecomienda() {
        Producto oculto = producto(15.0, 0);
        oculto.setEsVisible(false);

        alertaService.recomendarNuevoProducto(oculto);

        verifyNoInteractions(productoDAO, listaProductosDAO, pedidoDAO, usuarioDAO, alertaDAO);
    }

    private static final String CORREO = "cliente@test.com";

    private Cliente clienteAutenticado() {
        Cliente cliente = cliente("cliente-1", false);
        cliente.setActivada(true);
        when(usuarioDAO.findByEmail(CORREO)).thenReturn(Optional.of(cliente));
        return cliente;
    }

    private static Alerta alerta(String id, boolean leida) {
        Alerta alerta = new Alerta("cliente-1", TipoAlerta.BAJADA_PRECIO, PRODUCTO_ID, "Mensaje " + id,
                Instant.parse("2026-11-24T10:00:00Z"));
        ReflectionTestUtils.setField(alerta, "id", id);
        if (leida) {
            alerta.marcarLeida();
        }
        return alerta;
    }

    @Test
    void consultarDevuelveLasAlertasDelClienteYCuantasQuedanSinLeer() {
        clienteAutenticado();
        when(alertaDAO.findByClienteIdOrderByFechaDesc("cliente-1"))
                .thenReturn(List.of(alerta("a2", false), alerta("a1", true)));

        AlertasResponse respuesta = alertaService.consultar(" Cliente@Test.com ");

        assertEquals(List.of("a2", "a1"), respuesta.alertas().stream().map(a -> a.id()).toList());
        assertEquals("Mensaje a2", respuesta.alertas().get(0).mensaje());
        assertEquals(1, respuesta.noLeidas());
    }

    @Test
    void marcarLeidaGuardaLaAlertaComoLeida() {
        clienteAutenticado();
        Alerta alerta = alerta("a1", false);
        when(alertaDAO.findByIdAndClienteId("a1", "cliente-1")).thenReturn(Optional.of(alerta));
        when(alertaDAO.findByClienteIdOrderByFechaDesc("cliente-1")).thenReturn(List.of(alerta));

        AlertasResponse respuesta = alertaService.marcarLeida(CORREO, "a1");

        assertTrue(alerta.isLeida());
        verify(alertaDAO).save(alerta);
        assertEquals(0, respuesta.noLeidas());
    }

    @Test
    void marcarLeidaUnaAlertaQueNoExisteDevuelveNoEncontrada() {
        clienteAutenticado();
        when(alertaDAO.findByIdAndClienteId("otra", "cliente-1")).thenReturn(Optional.empty());

        assertThrows(AlertaNoEncontradaException.class, () -> alertaService.marcarLeida(CORREO, "otra"));
        verify(alertaDAO, never()).save(any());
    }

    @Test
    void marcarTodasLeidasMarcaTodasLasAlertasDelCliente() {
        clienteAutenticado();
        List<Alerta> alertas = List.of(alerta("a1", false), alerta("a2", false));
        when(alertaDAO.findByClienteIdOrderByFechaDesc("cliente-1")).thenReturn(alertas);

        AlertasResponse respuesta = alertaService.marcarTodasLeidas(CORREO);

        assertTrue(alertas.stream().allMatch(Alerta::isLeida));
        verify(alertaDAO).saveAll(alertas);
        assertEquals(0, respuesta.noLeidas());
    }

    @Test
    void soloLaPropiaAlertaSePuedeMarcarComoLeida() {
        clienteAutenticado();
        when(alertaDAO.findByIdAndClienteId("alerta-de-otro", "cliente-1")).thenReturn(Optional.empty());

        assertThrows(AlertaNoEncontradaException.class, () -> alertaService.marcarLeida(CORREO, "alerta-de-otro"));
        verify(alertaDAO).findByIdAndClienteId("alerta-de-otro", "cliente-1");
    }

    @Test
    void unUsuarioQueNoEsClienteNoAccedeALasAlertas() {
        Vendedor vendedor = new Vendedor();
        vendedor.setActivada(true);
        when(usuarioDAO.findByEmail(CORREO)).thenReturn(Optional.of(vendedor));

        assertThrows(AccessDeniedException.class, () -> alertaService.consultar(CORREO));
        verifyNoInteractions(alertaDAO);
    }

    @Test
    void unClienteBloqueadoOSinCorreoNoAccedeALasAlertas() {
        Cliente bloqueado = cliente("cliente-1", false);
        bloqueado.setActivada(true);
        bloqueado.setBloqueada(true);
        when(usuarioDAO.findByEmail(CORREO)).thenReturn(Optional.of(bloqueado));

        assertThrows(AccessDeniedException.class, () -> alertaService.consultar(CORREO));
        assertThrows(AccessDeniedException.class, () -> alertaService.consultar(" "));
        verifyNoInteractions(alertaDAO);
    }

    @Test
    void sinNadieConElProductoEnFavoritosNoSeCreanAlertas() {
        when(listaProductosDAO.findFavoritosConProducto(PRODUCTO_ID)).thenReturn(List.of());
        when(usuarioDAO.findAllById(any())).thenReturn(List.of());

        alertaService.avisarSiBajaPrecio(producto(15.0, 0), 20.0);

        assertTrue(alertasGuardadas().isEmpty());
    }
}
