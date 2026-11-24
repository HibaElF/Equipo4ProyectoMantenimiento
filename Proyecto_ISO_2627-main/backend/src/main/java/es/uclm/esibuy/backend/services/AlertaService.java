package es.uclm.esibuy.backend.services;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.AlertaDAO;
import es.uclm.esibuy.backend.dao.ListaProductosDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.model.Alerta;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.ListaProductos;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.TipoAlerta;
import es.uclm.esibuy.backend.model.Usuario;

@Service
public class AlertaService {

    private static final Locale ESPANOL = Locale.of("es", "ES");

    private final AlertaDAO alertaDAO;
    private final ListaProductosDAO listaProductosDAO;
    private final UsuarioDAO usuarioDAO;

    public AlertaService(AlertaDAO alertaDAO, ListaProductosDAO listaProductosDAO, UsuarioDAO usuarioDAO) {
        this.alertaDAO = alertaDAO;
        this.listaProductosDAO = listaProductosDAO;
        this.usuarioDAO = usuarioDAO;
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

    static boolean estaDisponible(Producto producto) {
        return producto.isEsVisible() && producto.getStock() > 0;
    }

    private void avisarClientesConFavorito(Producto producto, TipoAlerta tipo, String mensaje) {
        List<String> usuarios = listaProductosDAO.findFavoritosConProducto(producto.getId()).stream()
                .map(ListaProductos::getUsuarioId)
                .toList();
        avisar(usuarios, producto, tipo, mensaje);
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
