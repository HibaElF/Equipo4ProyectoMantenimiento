package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.RecordComponent;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import es.uclm.esibuy.backend.dao.CarritoDAO;
import es.uclm.esibuy.backend.dao.ListaProductosDAO;
import es.uclm.esibuy.backend.dao.LoginAttemptStore;
import es.uclm.esibuy.backend.dao.MetodoPagoDAO;
import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.dao.ValoracionDAO;
import es.uclm.esibuy.backend.dto.ExportacionDatosResponse;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Administrador;
import es.uclm.esibuy.backend.model.Carrito;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.Direccion;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.ListaProductos;
import es.uclm.esibuy.backend.model.MetodoPago;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.Valoracion;
import es.uclm.esibuy.backend.model.Vendedor;
import tools.jackson.databind.json.JsonMapper;

class ExportacionDatosServiceTests {

    private static final Instant AHORA = Instant.parse("2026-11-24T10:00:00Z");
    private static final String DNI = "12345678Z";
    private static final String TELEFONO = "+34 600 111 222";
    private static final String HASH = "hash-bcrypt-secreto-ABC";
    private static final String SECRETO_TOTP = "secreto-totp-cifrado-XYZ";
    private static final String CODIGO_RESPALDO = "codigo-respaldo-777";
    private static final String TOKEN_PAGO = "token-pago-privado-QQQ";

    private UsuarioDAO usuarioDAO;
    private PedidoDAO pedidoDAO;
    private MetodoPagoDAO metodoPagoDAO;
    private ListaProductosDAO listaProductosDAO;
    private CarritoDAO carritoDAO;
    private ValoracionDAO valoracionDAO;
    private ProductoDAO productoDAO;
    private LoginAttemptStore limites;
    private AuditoriaService auditoria;
    private ExportacionDatosService servicio;

    @BeforeEach
    void preparar() {
        usuarioDAO = mock(UsuarioDAO.class);
        pedidoDAO = mock(PedidoDAO.class);
        metodoPagoDAO = mock(MetodoPagoDAO.class);
        listaProductosDAO = mock(ListaProductosDAO.class);
        carritoDAO = mock(CarritoDAO.class);
        valoracionDAO = mock(ValoracionDAO.class);
        productoDAO = mock(ProductoDAO.class);
        limites = mock(LoginAttemptStore.class);
        auditoria = mock(AuditoriaService.class);
        when(limites.reservar(anyString(), anyString(), any(), anyInt(), anyInt())).thenReturn(0);
        servicio = new ExportacionDatosService(usuarioDAO, pedidoDAO, metodoPagoDAO, listaProductosDAO, carritoDAO,
                valoracionDAO, productoDAO, limites, auditoria, Clock.fixed(AHORA, ZoneOffset.UTC));
    }

    private static Cliente cliente(String id, String email) {
        Cliente cliente = new Cliente();
        cliente.setId(id);
        cliente.setNombre("Ada");
        cliente.setApellidos("Lovelace");
        cliente.setEmail(email);
        cliente.setDniNif(DNI);
        cliente.setTelefono(TELEFONO);
        cliente.setFechaNacimiento(LocalDate.of(1990, 12, 10));
        cliente.setActivada(true);
        cliente.registrarContrasenaHash(HASH);
        cliente.setSecretoTotpCifrado(SECRETO_TOTP);
        cliente.setCodigosRespaldoTotp(new ArrayList<>(List.of(CODIGO_RESPALDO)));
        cliente.registrarAceptacionPolitica("1.0", AHORA);
        Direccion direccion = new Direccion();
        direccion.setCalle("Calle Mayor");
        direccion.setCiudad("Ciudad Real");
        cliente.agregarDireccion(direccion);
        return cliente;
    }

    private static Vendedor vendedor() {
        Vendedor vendedor = new Vendedor();
        vendedor.setId("v1");
        vendedor.setNombre("Luis");
        vendedor.setApellidos("López");
        vendedor.setEmail("luis@example.com");
        vendedor.setDniNif(DNI);
        vendedor.setTelefono(TELEFONO);
        vendedor.setNombreComercial("UrbanStyle");
        vendedor.setCategoriaId("cat-1");
        vendedor.registrarContrasenaHash(HASH);
        vendedor.setSecretoTotpCifrado(SECRETO_TOTP);
        return vendedor;
    }

    private static String json(Object objeto) {
        return JsonMapper.builder().build().writeValueAsString(objeto);
    }

    private void datosDelCliente(Cliente cliente) {
        when(usuarioDAO.findByEmail(cliente.getEmail())).thenReturn(Optional.of(cliente));
        MetodoPago pago = new MetodoPago();
        pago.setTipo("tarjeta");
        pago.setNombre("Mi tarjeta");
        pago.setToken(TOKEN_PAGO);
        pago.setReferenciaEnmascarada("**** 4242");
        pago.setTitular("Ada Lovelace");
        pago.setCaducidad("12/30");
        when(metodoPagoDAO.findByClienteId(cliente.getId())).thenReturn(List.of(pago));
        Pedido pedido = Pedido.builder().id("p1").compraId("compra-1").clienteId(cliente.getId())
                .estado(EstadoPedido.PAGADO_COMPLETADO).importe(new BigDecimal("20.00")).fechaCreacion(AHORA)
                .lineas(List.of(new LineaPedido("prod-1", "Teclado", new BigDecimal("10.00"), 2, "v1", "UrbanStyle")))
                .build();
        when(pedidoDAO.findByClienteId(cliente.getId())).thenReturn(List.of(pedido));
        ListaProductos lista = new ListaProductos("l1", cliente.getId(), "Favoritos", true);
        when(listaProductosDAO.findByUsuarioId(cliente.getId())).thenReturn(List.of(lista));
        Carrito carrito = new Carrito(cliente.getId()).conCantidad("prod-1", 3);
        when(carritoDAO.findById(cliente.getId())).thenReturn(Optional.of(carrito));
        when(valoracionDAO.findByClienteId(cliente.getId()))
                .thenReturn(List.of(new Valoracion(cliente.getId(), "p1", "prod-1", 5, "Muy bueno")));
    }

    @Test
    void elClienteRecibeSusDatosConDniYTelefonoCompletos() {
        Cliente cliente = cliente("c1", "ada@example.com");
        datosDelCliente(cliente);

        ExportacionDatosResponse respuesta = servicio.exportar("ada@example.com");

        assertEquals("cliente", respuesta.tipoUsuario());
        assertEquals(AHORA, respuesta.fechaExportacion());
        assertEquals(DNI, respuesta.perfil().dniNif());
        assertEquals(TELEFONO, respuesta.perfil().telefono());
        assertEquals("1.0", respuesta.cuenta().versionPoliticaAceptada());
        assertEquals(1, respuesta.direcciones().size());
        assertEquals("**** 4242", respuesta.metodosPago().getFirst().referenciaEnmascarada());
        assertEquals("p1", respuesta.pedidos().getFirst().id());
        assertEquals("Favoritos", respuesta.listas().getFirst().nombre());
        assertEquals(3, respuesta.carrito().get("prod-1"));
        assertEquals("Muy bueno", respuesta.valoraciones().getFirst().comentario());
        assertNull(respuesta.productos());
        assertNull(respuesta.pedidosRecibidos());
    }

    @Test
    void laExportacionNoContieneSecretosNiTokens() {
        Cliente cliente = cliente("c1", "ada@example.com");
        datosDelCliente(cliente);

        String contenido = json(servicio.exportar("ada@example.com"));

        for (String secreto : List.of(HASH, SECRETO_TOTP, CODIGO_RESPALDO, TOKEN_PAGO)) {
            assertFalse(contenido.contains(secreto), "No debe aparecer: " + secreto);
        }
        assertTrue(contenido.contains(DNI));
    }

    @Test
    void ningunCampoDelDtoSeLlamaComoUnSecreto() {
        Set<String> prohibidos = Set.of("hash", "secreto", "token", "codigosrespaldo", "totpsecret", "password", "contrasenahash",
                "historialcontrasenas");
        List<Class<?>> pendientes = new ArrayList<>(List.of(ExportacionDatosResponse.class));
        pendientes.addAll(List.of(ExportacionDatosResponse.class.getDeclaredClasses()));

        for (Class<?> tipo : pendientes) {
            for (RecordComponent componente : tipo.getRecordComponents()) {
                String nombre = componente.getName().toLowerCase();
                for (String prohibido : prohibidos) {
                    assertFalse(nombre.contains(prohibido),
                            tipo.getSimpleName() + "." + componente.getName() + " parece un secreto");
                }
            }
        }
    }

    @Test
    void cadaUsuarioSoloObtieneSusPropiosDatos() {
        Cliente ada = cliente("c1", "ada@example.com");
        Cliente otro = cliente("c2", "otro@example.com");
        otro.setNombre("Otro");
        datosDelCliente(ada);
        when(usuarioDAO.findByEmail("otro@example.com")).thenReturn(Optional.of(otro));
        when(pedidoDAO.findByClienteId("c2")).thenReturn(List.of());

        ExportacionDatosResponse deOtro = servicio.exportar("otro@example.com");

        assertEquals("Otro", deOtro.perfil().nombre());
        assertTrue(deOtro.pedidos().isEmpty());
        // Solo se consulta con el identificador del usuario autenticado, nunca con el de otro.
        verify(pedidoDAO).findByClienteId("c2");
        verify(pedidoDAO, never()).findByClienteId("c1");
        verify(metodoPagoDAO, never()).findByClienteId("c1");
        verify(valoracionDAO, never()).findByClienteId("c1");
    }

    @Test
    void elVendedorRecibeSusProductosYPedidosSinDatosDeLosCompradores() {
        Vendedor vendedor = vendedor();
        when(usuarioDAO.findByEmail("luis@example.com")).thenReturn(Optional.of(vendedor));
        Producto producto = new Producto();
        producto.setId("prod-1");
        producto.setNombre("Teclado");
        producto.setVendedor("UrbanStyle");
        producto.setPrecio(10.0);
        when(productoDAO.findByVendedor("UrbanStyle")).thenReturn(List.of(producto));
        Direccion direccionComprador = new Direccion();
        direccionComprador.setCalle("Calle Secreta del Comprador");
        Pedido pedido = Pedido.builder().id("p1").compraId("compra-1").clienteId("c1")
                .estado(EstadoPedido.PAGADO_COMPLETADO).importe(new BigDecimal("30.00")).fechaCreacion(AHORA)
                .direccionEnvio(direccionComprador)
                .lineas(List.of(
                        new LineaPedido("prod-1", "Teclado", new BigDecimal("10.00"), 2, "v1", "UrbanStyle"),
                        new LineaPedido("prod-9", "Ajeno", new BigDecimal("10.00"), 1, "v2", "OtraTienda")))
                .build();
        when(pedidoDAO.findByVendedorId("v1")).thenReturn(List.of(pedido));

        ExportacionDatosResponse respuesta = servicio.exportar("luis@example.com");

        assertEquals("vendedor", respuesta.tipoUsuario());
        assertEquals("UrbanStyle", respuesta.perfil().nombreComercial());
        assertEquals(1, respuesta.productos().size());
        assertEquals(1, respuesta.pedidosRecibidos().size());
        assertEquals(1, respuesta.pedidosRecibidos().getFirst().lineas().size());
        assertEquals("prod-1", respuesta.pedidosRecibidos().getFirst().lineas().getFirst().productoId());

        String contenido = json(respuesta);
        assertFalse(contenido.contains("Calle Secreta del Comprador"));
        assertFalse(contenido.contains("OtraTienda"));
        assertFalse(contenido.contains("\"c1\""));
        assertFalse(contenido.contains(HASH));
        assertFalse(contenido.contains(SECRETO_TOTP));
        verify(pedidoDAO, never()).findByClienteId(anyString());
    }

    @Test
    void elAdministradorSoloRecibePerfilYCuenta() {
        Administrador admin = new Administrador();
        admin.setId("a1");
        admin.setNombre("Root");
        admin.setApellidos("Admin");
        admin.setEmail("root@example.com");
        admin.registrarContrasenaHash(HASH);
        when(usuarioDAO.findByEmail("root@example.com")).thenReturn(Optional.of(admin));

        ExportacionDatosResponse respuesta = servicio.exportar("root@example.com");

        assertEquals("administrador", respuesta.tipoUsuario());
        assertEquals("Root", respuesta.perfil().nombre());
        assertNull(respuesta.pedidos());
        assertFalse(json(respuesta).contains(HASH));
        verifyNoInteractions(pedidoDAO, metodoPagoDAO, valoracionDAO, productoDAO);
    }

    @Test
    void cadaExportacionQuedaAuditadaSinDatosPersonales() {
        Cliente cliente = cliente("c1", "ada@example.com");
        datosDelCliente(cliente);

        servicio.exportar("ada@example.com");

        verify(auditoria).registrarEvento(eq("exportacion_datos"), eq("exito"), eq("c1"),
                eq(Map.of("tipoUsuario", "cliente")));
    }

    @Test
    void unaSegundaExportacionDentroDelMinutoSeRechazaConRetryAfterYSinAuditar() {
        Cliente cliente = cliente("c1", "ada@example.com");
        datosDelCliente(cliente);
        when(limites.reservar(eq("exportacion_datos"), eq("c1"), eq(AHORA), eq(60), eq(1))).thenReturn(42);

        LoginRateLimitException error = assertThrows(LoginRateLimitException.class,
                () -> servicio.exportar("ada@example.com"));

        assertEquals(42, error.getRetryAfterSeconds());
        verifyNoInteractions(pedidoDAO, metodoPagoDAO, auditoria);
    }

    @Test
    void unUsuarioInexistenteNoSePuedeExportar() {
        when(usuarioDAO.findByEmail("nadie@example.com")).thenReturn(Optional.empty());

        assertThrows(UsuarioNoEncontradoException.class, () -> servicio.exportar("nadie@example.com"));
        verifyNoInteractions(limites, auditoria);
    }
}
