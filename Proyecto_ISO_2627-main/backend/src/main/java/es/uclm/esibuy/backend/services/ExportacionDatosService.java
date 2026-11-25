package es.uclm.esibuy.backend.services;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.CarritoDAO;
import es.uclm.esibuy.backend.dao.ListaProductosDAO;
import es.uclm.esibuy.backend.dao.LoginAttemptStore;
import es.uclm.esibuy.backend.dao.MetodoPagoDAO;
import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.dao.ValoracionDAO;
import es.uclm.esibuy.backend.dto.ExportacionDatosResponse;
import es.uclm.esibuy.backend.dto.ExportacionDatosResponse.Cuenta;
import es.uclm.esibuy.backend.dto.ExportacionDatosResponse.Perfil;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Administrador;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Usuario;
import es.uclm.esibuy.backend.model.Vendedor;

// T-25: exportación de los datos personales del propio usuario (acceso y portabilidad). El propietario sale
// siempre de la sesión. DNI y teléfono se entregan descifrados porque la exportación es solo para su titular.
@Service
public class ExportacionDatosService {

    static final String TIPO_LIMITE = "exportacion_datos";
    static final int SEGUNDOS_ENTRE_EXPORTACIONES = 60;

    private final UsuarioDAO usuarioDAO;
    private final PedidoDAO pedidoDAO;
    private final MetodoPagoDAO metodoPagoDAO;
    private final ListaProductosDAO listaProductosDAO;
    private final CarritoDAO carritoDAO;
    private final ValoracionDAO valoracionDAO;
    private final ProductoDAO productoDAO;
    private final LoginAttemptStore limites;
    private final AuditoriaService auditoriaService;
    private final Clock reloj;

    @Autowired
    public ExportacionDatosService(
            UsuarioDAO usuarioDAO,
            PedidoDAO pedidoDAO,
            MetodoPagoDAO metodoPagoDAO,
            ListaProductosDAO listaProductosDAO,
            CarritoDAO carritoDAO,
            ValoracionDAO valoracionDAO,
            ProductoDAO productoDAO,
            LoginAttemptStore limites,
            AuditoriaService auditoriaService) {
        this(usuarioDAO, pedidoDAO, metodoPagoDAO, listaProductosDAO, carritoDAO, valoracionDAO, productoDAO,
                limites, auditoriaService, Clock.systemUTC());
    }

    ExportacionDatosService(
            UsuarioDAO usuarioDAO,
            PedidoDAO pedidoDAO,
            MetodoPagoDAO metodoPagoDAO,
            ListaProductosDAO listaProductosDAO,
            CarritoDAO carritoDAO,
            ValoracionDAO valoracionDAO,
            ProductoDAO productoDAO,
            LoginAttemptStore limites,
            AuditoriaService auditoriaService,
            Clock reloj) {
        this.usuarioDAO = usuarioDAO;
        this.pedidoDAO = pedidoDAO;
        this.metodoPagoDAO = metodoPagoDAO;
        this.listaProductosDAO = listaProductosDAO;
        this.carritoDAO = carritoDAO;
        this.valoracionDAO = valoracionDAO;
        this.productoDAO = productoDAO;
        this.limites = limites;
        this.auditoriaService = auditoriaService;
        this.reloj = reloj;
    }

    public ExportacionDatosResponse exportar(String emailAutenticado) {
        Usuario usuario = usuarioDAO.findByEmail(emailAutenticado)
                .orElseThrow(UsuarioNoEncontradoException::new);

        // Una exportación por minuto y usuario; si se supera, 429 con Retry-After.
        Instant ahora = reloj.instant();
        int espera = limites.reservar(TIPO_LIMITE, usuario.getId(), ahora, SEGUNDOS_ENTRE_EXPORTACIONES, 1);
        if (espera > 0) {
            throw new LoginRateLimitException(espera);
        }

        ExportacionDatosResponse respuesta = switch (usuario) {
            case Cliente cliente -> exportarCliente(cliente, ahora);
            case Vendedor vendedor -> exportarVendedor(vendedor, ahora);
            case Administrador administrador -> exportarAdministrador(administrador, ahora);
            default -> throw new UsuarioNoEncontradoException();
        };

        // El detalle solo lleva el tipo de usuario y el número de pedidos, nunca datos personales.
        auditoriaService.registrarEvento(TIPO_LIMITE, "exito", usuario.getId(),
                Map.of("tipoUsuario", respuesta.tipoUsuario()));
        return respuesta;
    }

    private ExportacionDatosResponse exportarCliente(Cliente cliente, Instant ahora) {
        String id = cliente.getId();
        Perfil perfil = new Perfil(cliente.getNombre(), cliente.getApellidos(), cliente.getEmail(),
                cliente.getTelefono(), cliente.getImagenPerfil(), cliente.getDniNif(),
                cliente.getFechaNacimiento(), cliente.isEsPremium(), null, null, null, null);

        List<ExportacionDatosResponse.Direccion> direcciones = cliente.getDirecciones().stream()
                .map(ExportacionDatosService::aDireccion).toList();
        List<ExportacionDatosResponse.MetodoPago> metodos = metodoPagoDAO.findByClienteId(id).stream()
                // El token del método de pago nunca sale del servidor.
                .map(m -> new ExportacionDatosResponse.MetodoPago(m.getTipo(), m.getNombre(),
                        m.getReferenciaEnmascarada(), m.getTitular(), m.getCaducidad(), m.getFechaAlta()))
                .toList();
        List<ExportacionDatosResponse.Pedido> pedidos = pedidoDAO.findByClienteId(id).stream()
                .map(ExportacionDatosService::aPedido).toList();
        Map<String, Integer> carrito = carritoDAO.findById(id)
                .map(c -> (Map<String, Integer>) new LinkedHashMap<>(c.getProductos()))
                .orElse(Map.of());
        List<ExportacionDatosResponse.Valoracion> valoraciones = valoracionDAO.findByClienteId(id).stream()
                .map(v -> new ExportacionDatosResponse.Valoracion(v.pedidoId(), v.productoId(), v.puntuacion(),
                        v.comentario()))
                .toList();

        return new ExportacionDatosResponse(ahora, "cliente", perfil, aCuenta(cliente), direcciones, metodos,
                pedidos, listas(id), carrito, valoraciones, null, null);
    }

    private ExportacionDatosResponse exportarVendedor(Vendedor vendedor, Instant ahora) {
        String id = vendedor.getId();
        Perfil perfil = new Perfil(vendedor.getNombre(), vendedor.getApellidos(), vendedor.getEmail(),
                vendedor.getTelefono(), vendedor.getImagenPerfil(), vendedor.getDniNif(), null, null,
                vendedor.getNombreComercial(), vendedor.getCategoriaId(), null, null);

        List<ExportacionDatosResponse.Producto> productos = productoDAO.findByVendedor(vendedor.getNombreComercial())
                .stream()
                .map(p -> new ExportacionDatosResponse.Producto(p.getId(), p.getNombre(), p.getCategoria(),
                        p.getStock(), p.getDescripcion(), p.getPrecio(), p.getDescuento(), p.getDescuentoPremium(),
                        p.isSoloPremium(), p.isEsVisible(), p.getImagen()))
                .toList();
        // Pedidos recibidos: solo las líneas propias y sin datos del comprador (son datos de terceros).
        List<ExportacionDatosResponse.PedidoRecibido> recibidos = pedidoDAO.findByVendedorId(id).stream()
                .map(p -> new ExportacionDatosResponse.PedidoRecibido(p.getId(), p.getEstado(), p.getFechaCreacion(),
                        p.getLineas().stream()
                                .filter(l -> id.equals(l.vendedorId()))
                                .map(ExportacionDatosService::aLinea)
                                .toList()))
                .toList();

        return new ExportacionDatosResponse(ahora, "vendedor", perfil, aCuenta(vendedor), null, null, null,
                listas(id), null, null, productos, recibidos);
    }

    private ExportacionDatosResponse exportarAdministrador(Administrador administrador, Instant ahora) {
        Perfil perfil = new Perfil(administrador.getNombre(), administrador.getApellidos(),
                administrador.getEmail(), administrador.getTelefono(), administrador.getImagenPerfil(), null, null,
                null, null, null, administrador.getSede(), administrador.getFechaIncorporacion());
        return new ExportacionDatosResponse(ahora, "administrador", perfil, aCuenta(administrador), null, null,
                null, null, null, null, null, null);
    }

    private List<ExportacionDatosResponse.Lista> listas(String usuarioId) {
        return listaProductosDAO.findByUsuarioId(usuarioId).stream()
                .map(l -> new ExportacionDatosResponse.Lista(l.getNombre(), l.isPredeterminada(),
                        new ArrayList<>(l.getProductos())))
                .toList();
    }

    private static Cuenta aCuenta(Usuario usuario) {
        return new Cuenta(usuario.isActivada(), usuario.isBloqueada(), usuario.isCorreoVerificado(),
                usuario.isTotpActivado(), usuario.isEmailOtpActivado(), usuario.getVersionPoliticaAceptada(),
                usuario.getFechaAceptacionPolitica(), usuario.getContrasenaCambiadaEn());
    }

    private static ExportacionDatosResponse.Direccion aDireccion(es.uclm.esibuy.backend.model.Direccion d) {
        if (d == null) {
            return null;
        }
        return new ExportacionDatosResponse.Direccion(d.getNombre(), d.getCalle(), d.getNumero(), d.getPortal(),
                d.getPiso(), d.getCodigoPostal(), d.getCiudad(), d.getProvincia());
    }

    private static ExportacionDatosResponse.LineaPedido aLinea(LineaPedido l) {
        return new ExportacionDatosResponse.LineaPedido(l.productoId(), l.nombreProducto(), l.precioCompra(),
                l.cantidad(), l.nombreVendedor());
    }

    private static ExportacionDatosResponse.Pedido aPedido(Pedido p) {
        List<LineaPedido> lineas = p.getLineas() == null ? List.of() : p.getLineas();
        return new ExportacionDatosResponse.Pedido(p.getId(), p.getCompraId(), p.getEstado(), p.getFechaCreacion(),
                p.getFechaPago(), p.getImporte(), aDireccion(p.getDireccionEnvio()),
                lineas.stream().map(ExportacionDatosService::aLinea).toList(), p.getHistorialEstados());
    }
}
