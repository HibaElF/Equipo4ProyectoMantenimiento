package es.uclm.esibuy.backend.services;

import java.util.List;
import java.util.Map;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.VendedorDAO;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
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

    private final VendedorDAO vendedorDAO;
    private final ProductoDAO productoDAO;
    private final PedidoDAO pedidoDAO;

    public EstadisticasVendedorService(
            VendedorDAO vendedorDAO,
            ProductoDAO productoDAO,
            PedidoDAO pedidoDAO) {

        this.vendedorDAO = vendedorDAO;
        this.productoDAO = productoDAO;
        this.pedidoDAO = pedidoDAO;
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
