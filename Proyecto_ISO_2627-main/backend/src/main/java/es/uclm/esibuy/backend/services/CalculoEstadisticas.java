package es.uclm.esibuy.backend.services;

import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;

// Cálculos comunes de las estadísticas. Trabajan sobre los datos ya leídos de la base de datos, así que sirven
// igual para las estadísticas de un vendedor (sus productos) que para las del administrador (todos).
final class CalculoEstadisticas {

    static final int TAMANO_RANKING = 10;

    private static final Comparator<ProductoVentasResponse> POR_NOMBRE_VENTAS = Comparator.comparing(
            ProductoVentasResponse::nombre, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));

    private CalculoEstadisticas() {
    }

    // Unidades vendidas de cada producto. Solo cuentan los pedidos finalizados.
    static Map<String, Integer> unidadesVendidasPorProducto(Collection<Pedido> pedidos) {
        Map<String, Integer> unidades = new HashMap<>();
        for (Pedido pedido : pedidos) {
            if (pedido.getEstado() != EstadoPedido.FINALIZADO || pedido.getLineas() == null) {
                continue;
            }
            for (LineaPedido linea : pedido.getLineas()) {
                if (linea != null && linea.productoId() != null) {
                    unidades.merge(linea.productoId(), linea.cantidad(), Integer::sum);
                }
            }
        }
        return unidades;
    }

    // Ventas de cada producto, también de los que no se han vendido nunca (0 unidades)
    static List<ProductoVentasResponse> ventasPorProducto(
            Collection<Producto> productos,
            Map<String, Integer> unidadesVendidas) {

        return productos.stream()
                .map(producto -> new ProductoVentasResponse(
                        producto.getId(),
                        producto.getNombre(),
                        producto.getVendedor(),
                        unidadesVendidas.getOrDefault(producto.getId(), 0)))
                .toList();
    }

    // Top 10 más vendidos: más unidades primero; a igualdad de unidades, por nombre
    static List<ProductoVentasResponse> masVendidos(List<ProductoVentasResponse> ventas) {
        return ventas.stream()
                .sorted(Comparator.comparingInt(ProductoVentasResponse::unidadesVendidas).reversed()
                        .thenComparing(POR_NOMBRE_VENTAS))
                .limit(TAMANO_RANKING)
                .toList();
    }

    // Top 10 menos vendidos: menos unidades primero (los que tienen 0 ventas, los primeros)
    static List<ProductoVentasResponse> menosVendidos(List<ProductoVentasResponse> ventas) {
        return ventas.stream()
                .sorted(Comparator.comparingInt(ProductoVentasResponse::unidadesVendidas)
                        .thenComparing(POR_NOMBRE_VENTAS))
                .limit(TAMANO_RANKING)
                .toList();
    }

    static List<String> identificadores(Collection<Producto> productos) {
        return productos.stream().map(Producto::getId).toList();
    }
}
