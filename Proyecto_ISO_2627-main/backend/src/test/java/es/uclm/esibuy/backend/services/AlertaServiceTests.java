package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import es.uclm.esibuy.backend.dao.AlertaDAO;
import es.uclm.esibuy.backend.dao.ListaProductosDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.model.Alerta;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.ListaProductos;
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
    void sinNadieConElProductoEnFavoritosNoSeCreanAlertas() {
        when(listaProductosDAO.findFavoritosConProducto(PRODUCTO_ID)).thenReturn(List.of());
        when(usuarioDAO.findAllById(any())).thenReturn(List.of());

        alertaService.avisarSiBajaPrecio(producto(15.0, 0), 20.0);

        assertTrue(alertasGuardadas().isEmpty());
    }
}
