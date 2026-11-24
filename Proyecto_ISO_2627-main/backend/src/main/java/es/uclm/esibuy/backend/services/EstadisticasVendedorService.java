package es.uclm.esibuy.backend.services;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.ValoracionDAO;
import es.uclm.esibuy.backend.dao.VendedorDAO;
import es.uclm.esibuy.backend.dto.EstadisticasValoracionesResponse;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoValoracionResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.Vendedor;

// Estadísticas del vendedor de la sesión. Solo se calculan sobre sus propios productos.
@Service
public class EstadisticasVendedorService {

    static final String MENSAJE_SOLO_VENDEDOR = "Solo un vendedor activo puede consultar sus estadísticas.";
    static final String AVISO_SIN_PRODUCTOS = "Todavía no tienes productos en tu catálogo.";
    static final String AVISO_SIN_VENTAS =
            "Todavía no tienes ventas en pedidos finalizados: tus productos aparecen con 0 unidades.";
    static final String AVISO_POCOS_PRODUCTOS =
            "Tienes menos de 10 productos, así que las dos listas muestran todo tu catálogo.";
    static final String AVISO_SIN_VALORACIONES = "Todavía no hay valoraciones de tus productos.";
    static final String AVISO_POCAS_VALORACIONES =
            "Menos de 10 de tus productos tienen valoraciones: las dos listas muestran todos los valorados.";

    private final VendedorDAO vendedorDAO;
    private final ProductoDAO productoDAO;
    private final PedidoDAO pedidoDAO;
    private final ValoracionDAO valoracionDAO;

    public EstadisticasVendedorService(
            VendedorDAO vendedorDAO,
            ProductoDAO productoDAO,
            PedidoDAO pedidoDAO,
            ValoracionDAO valoracionDAO) {

        this.vendedorDAO = vendedorDAO;
        this.productoDAO = productoDAO;
        this.pedidoDAO = pedidoDAO;
        this.valoracionDAO = valoracionDAO;
    }

    // PBI 276: Top 10 de productos más vendidos y menos vendidos (unidades en pedidos finalizados)
    public EstadisticasVentasResponse consultarVentas(String emailAutenticado) {
        List<Producto> productos = productosDelVendedor(emailAutenticado);
        Map<String, Integer> unidades = productos.isEmpty()
                ? Map.of()
                : CalculoEstadisticas.unidadesVendidasPorProducto(
                        pedidoDAO.findConAlgunProducto(CalculoEstadisticas.identificadores(productos)));

        List<ProductoVentasResponse> ventas = CalculoEstadisticas.ventasPorProducto(productos, unidades);
        return new EstadisticasVentasResponse(
                CalculoEstadisticas.masVendidos(ventas),
                CalculoEstadisticas.menosVendidos(ventas),
                avisoVentas(ventas));
    }

    // PBI 277: Top 10 de productos mejor y peor valorados (solo los que tienen alguna valoración)
    public EstadisticasValoracionesResponse consultarValoraciones(String emailAutenticado) {
        List<ProductoValoracionResponse> valoraciones = valoracionesDe(productosDelVendedor(emailAutenticado));
        return new EstadisticasValoracionesResponse(
                CalculoEstadisticas.mejorValorados(valoraciones),
                CalculoEstadisticas.peorValorados(valoraciones),
                avisoValoraciones(valoraciones));
    }

    private List<ProductoValoracionResponse> valoracionesDe(List<Producto> productos) {
        if (productos.isEmpty()) {
            return List.of();
        }
        return CalculoEstadisticas.valoracionesPorProducto(
                productos,
                CalculoEstadisticas.puntuacionesPorProducto(
                        valoracionDAO.findByProductoIdIn(CalculoEstadisticas.identificadores(productos))));
    }

    private static String avisoValoraciones(List<ProductoValoracionResponse> valoraciones) {
        long valorados = valoraciones.stream().filter(CalculoEstadisticas::tieneValoraciones).count();
        if (valorados == 0) {
            return AVISO_SIN_VALORACIONES;
        }
        if (valorados < CalculoEstadisticas.TAMANO_RANKING) {
            return AVISO_POCAS_VALORACIONES;
        }
        return null;
    }

    private static String avisoVentas(List<ProductoVentasResponse> ventas) {
        if (ventas.isEmpty()) {
            return AVISO_SIN_PRODUCTOS;
        }
        if (ventas.stream().allMatch(venta -> venta.unidadesVendidas() == 0)) {
            return AVISO_SIN_VENTAS;
        }
        if (ventas.size() < CalculoEstadisticas.TAMANO_RANKING) {
            return AVISO_POCOS_PRODUCTOS;
        }
        return null;
    }

    private List<Producto> productosDelVendedor(String correo) {
        return productoDAO.findByVendedor(obtenerVendedorActivo(correo).getNombreComercial());
    }

    private Vendedor obtenerVendedorActivo(String correo) {
        if (correo == null || correo.isBlank()) {
            throw new AccessDeniedException(MENSAJE_SOLO_VENDEDOR);
        }
        return vendedorDAO.findByEmail(correo)
                .filter(vendedor -> vendedor.isActivada() && !vendedor.isBloqueada())
                .orElseThrow(() -> new AccessDeniedException(MENSAJE_SOLO_VENDEDOR));
    }
}
