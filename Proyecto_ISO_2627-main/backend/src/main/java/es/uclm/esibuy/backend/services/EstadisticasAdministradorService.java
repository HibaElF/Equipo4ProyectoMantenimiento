package es.uclm.esibuy.backend.services;

import java.util.List;

import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.ValoracionDAO;
import es.uclm.esibuy.backend.dto.EstadisticasValoracionesResponse;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoValoracionResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.Producto;

// Estadísticas globales para el administrador: productos de todas las tiendas de la plataforma.
@Service
public class EstadisticasAdministradorService {

    static final String AVISO_SIN_PRODUCTOS = "Todavía no hay productos en la plataforma.";
    static final String AVISO_SIN_VENTAS =
            "Todavía no hay ventas en pedidos finalizados: los productos aparecen con 0 unidades.";
    static final String AVISO_POCOS_PRODUCTOS =
            "Hay menos de 10 productos en la plataforma, así que las dos listas muestran todos.";
    static final String AVISO_SIN_VALORACIONES = "Todavía no hay valoraciones en la plataforma.";
    static final String AVISO_POCAS_VALORACIONES =
            "Menos de 10 productos tienen valoraciones: las dos listas muestran todos los valorados.";

    private final ProductoDAO productoDAO;
    private final PedidoDAO pedidoDAO;
    private final ValoracionDAO valoracionDAO;

    public EstadisticasAdministradorService(
            ProductoDAO productoDAO,
            PedidoDAO pedidoDAO,
            ValoracionDAO valoracionDAO) {

        this.productoDAO = productoDAO;
        this.pedidoDAO = pedidoDAO;
        this.valoracionDAO = valoracionDAO;
    }

    // PBI 279: Top 10 de productos más y menos vendidos de todas las tiendas (unidades en pedidos finalizados)
    public EstadisticasVentasResponse consultarVentas() {
        List<Producto> productos = productoDAO.findAll();
        List<ProductoVentasResponse> ventas = CalculoEstadisticas.ventasPorProducto(
                productos,
                CalculoEstadisticas.unidadesVendidasPorProducto(pedidoDAO.findByEstado(EstadoPedido.FINALIZADO)));

        return new EstadisticasVentasResponse(
                CalculoEstadisticas.masVendidos(ventas),
                CalculoEstadisticas.menosVendidos(ventas),
                CalculoEstadisticas.avisoVentas(ventas, AVISO_SIN_PRODUCTOS, AVISO_SIN_VENTAS, AVISO_POCOS_PRODUCTOS));
    }

    // PBI 280: Top 10 de productos mejor y peor valorados de todas las tiendas (solo los que tienen valoraciones)
    public EstadisticasValoracionesResponse consultarValoraciones() {
        List<ProductoValoracionResponse> valoraciones = CalculoEstadisticas.valoracionesPorProducto(
                productoDAO.findAll(),
                CalculoEstadisticas.puntuacionesPorProducto(valoracionDAO.findAll()));

        return new EstadisticasValoracionesResponse(
                CalculoEstadisticas.mejorValorados(valoraciones),
                CalculoEstadisticas.peorValorados(valoraciones),
                CalculoEstadisticas.avisoValoraciones(valoraciones, AVISO_SIN_VALORACIONES, AVISO_POCAS_VALORACIONES));
    }
}
