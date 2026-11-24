package es.uclm.esibuy.backend.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.AlertaDAO;
import es.uclm.esibuy.backend.dao.ListaProductosDAO;
import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.dto.AlertaResponse;
import es.uclm.esibuy.backend.dto.AlertasResponse;
import es.uclm.esibuy.backend.exceptions.AlertaNoEncontradaException;
import es.uclm.esibuy.backend.model.Alerta;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.ListaProductos;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.TipoAlerta;
import es.uclm.esibuy.backend.model.Usuario;

@Service
public class AlertaService {

    private static final Locale ESPANOL = Locale.of("es", "ES");

    private final AlertaDAO alertaDAO;
    private final ListaProductosDAO listaProductosDAO;
    private final UsuarioDAO usuarioDAO;
    private final ProductoDAO productoDAO;
    private final PedidoDAO pedidoDAO;

    public AlertaService(AlertaDAO alertaDAO, ListaProductosDAO listaProductosDAO, UsuarioDAO usuarioDAO,
            ProductoDAO productoDAO, PedidoDAO pedidoDAO) {
        this.alertaDAO = alertaDAO;
        this.listaProductosDAO = listaProductosDAO;
        this.usuarioDAO = usuarioDAO;
        this.productoDAO = productoDAO;
        this.pedidoDAO = pedidoDAO;
    }

    // Alertas del cliente, de la más reciente a la más antigua.
    public AlertasResponse consultar(String correoAutenticado) {
        return construirRespuesta(obtenerCliente(correoAutenticado));
    }

    public AlertasResponse marcarLeida(String correoAutenticado, String alertaId) {
        Cliente cliente = obtenerCliente(correoAutenticado);
        Alerta alerta = alertaDAO.findByIdAndClienteId(alertaId, cliente.getId())
                .orElseThrow(AlertaNoEncontradaException::new);
        alerta.marcarLeida();
        alertaDAO.save(alerta);
        return construirRespuesta(cliente);
    }

    public AlertasResponse marcarTodasLeidas(String correoAutenticado) {
        Cliente cliente = obtenerCliente(correoAutenticado);
        List<Alerta> alertas = alertaDAO.findByClienteIdOrderByFechaDesc(cliente.getId());
        alertas.forEach(Alerta::marcarLeida);
        alertaDAO.saveAll(alertas);
        return construirRespuesta(cliente);
    }

    // Se compara el precio que paga un cliente estándar (con el descuento normal).
    public void avisarSiBajaPrecio(Producto producto, Double precioAnterior) {
        Double precioNuevo = PrecioProducto.paraCliente(producto, false);
        if (!producto.isEsVisible() || precioAnterior == null || precioNuevo == null
                || precioNuevo >= precioAnterior) {
            return;
        }
        String mensaje = String.format(ESPANOL, "«%s», de tus favoritos, ha bajado de %.2f € a %.2f €.",
                producto.getNombre(), precioAnterior, precioNuevo);
        avisarClientesConFavorito(producto, TipoAlerta.BAJADA_PRECIO, mensaje);
    }

    public void avisarSiVuelveADisponible(Producto producto, boolean estabaDisponible) {
        if (estabaDisponible || !estaDisponible(producto)) {
            return;
        }
        String mensaje = "«" + producto.getNombre() + "», de tus favoritos, vuelve a estar disponible.";
        avisarClientesConFavorito(producto, TipoAlerta.DISPONIBILIDAD, mensaje);
    }

    // Interesa a quien tiene en sus favoritos, en sus listas o en sus pedidos algún producto de la misma categoría.
    public void recomendarNuevoProducto(Producto producto) {
        if (!estaDisponible(producto)) {
            return;
        }
        List<String> mismaCategoria = productoDAO.findByCategoriaIgnoreCase(producto.getCategoria()).stream()
                .map(Producto::getId)
                .filter(id -> !id.equals(producto.getId()))
                .toList();
        if (mismaCategoria.isEmpty()) {
            return;
        }
        Set<String> interesados = new LinkedHashSet<>();
        listaProductosDAO.findConAlgunProducto(mismaCategoria)
                .forEach(lista -> interesados.add(lista.getUsuarioId()));
        pedidoDAO.findConAlgunProducto(mismaCategoria).stream()
                .map(Pedido::getClienteId)
                .filter(Objects::nonNull)
                .forEach(interesados::add);
        String mensaje = "Nuevo producto en " + producto.getCategoria() + " que te puede interesar: «"
                + producto.getNombre() + "».";
        avisar(interesados, producto, TipoAlerta.RECOMENDACION, mensaje);
    }

    static boolean estaDisponible(Producto producto) {
        return producto.isEsVisible() && producto.getStock() > 0;
    }

    private void avisarClientesConFavorito(Producto producto, TipoAlerta tipo, String mensaje) {
        List<String> usuarios = listaProductosDAO.findFavoritosConProducto(producto.getId()).stream()
                .map(ListaProductos::getUsuarioId)
                .toList();
        avisar(usuarios, producto, tipo, mensaje);
    }

    private Cliente obtenerCliente(String correo) {
        if (correo == null || correo.isBlank()) {
            throw new AccessDeniedException("No se puede acceder a las alertas.");
        }
        return usuarioDAO.findByEmail(correo.trim().toLowerCase(Locale.ROOT))
                .filter(Cliente.class::isInstance)
                .map(Cliente.class::cast)
                .filter(cliente -> cliente.isActivada() && !cliente.isBloqueada())
                .orElseThrow(() -> new AccessDeniedException("No se puede acceder a las alertas."));
    }

    private AlertasResponse construirRespuesta(Cliente cliente) {
        List<AlertaResponse> alertas = alertaDAO.findByClienteIdOrderByFechaDesc(cliente.getId()).stream()
                .map(AlertaResponse::de)
                .toList();
        long noLeidas = alertas.stream().filter(alerta -> !alerta.leida()).count();
        return new AlertasResponse(alertas, noLeidas);
    }

    // Solo reciben alertas los clientes; un producto solo premium no se anuncia a los clientes estándar.
    private void avisar(Collection<String> usuarioIds, Producto producto, TipoAlerta tipo, String mensaje) {
        Instant ahora = Instant.now();
        List<Alerta> alertas = new ArrayList<>();
        for (Usuario usuario : usuarioDAO.findAllById(usuarioIds)) {
            if (usuario instanceof Cliente cliente && (!producto.isSoloPremium() || cliente.isEsPremium())) {
                alertas.add(new Alerta(cliente.getId(), tipo, producto.getId(), mensaje, ahora));
            }
        }
        alertaDAO.saveAll(alertas);
    }
}
