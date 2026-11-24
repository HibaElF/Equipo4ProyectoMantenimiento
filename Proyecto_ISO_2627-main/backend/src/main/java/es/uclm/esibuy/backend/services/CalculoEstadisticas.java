package es.uclm.esibuy.backend.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import es.uclm.esibuy.backend.dto.ProductoValoracionResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.Valoracion;

// Cálculos comunes de las estadísticas. Trabajan sobre los datos ya leídos de la base de datos, así que sirven
// igual para las estadísticas de un vendedor (sus productos) que para las del administrador (todos).
final class CalculoEstadisticas {

    static final int TAMANO_RANKING = 10;

    private static final Comparator<ProductoVentasResponse> POR_NOMBRE_VENTAS = Comparator.comparing(
            ProductoVentasResponse::nombre, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));

    private static final Comparator<ProductoValoracionResponse> POR_NOMBRE_VALORACION = Comparator.comparing(
            ProductoValoracionResponse::nombre, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));

    // A igualdad de media, primero el producto con más valoraciones (su media es más fiable) y luego por nombre
    private static final Comparator<ProductoValoracionResponse> DESEMPATE_VALORACION = Comparator
            .comparingInt(ProductoValoracionResponse::numeroValoraciones).reversed()
            .thenComparing(POR_NOMBRE_VALORACION);

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

    // Puntuaciones recibidas por cada producto
    static Map<String, List<Integer>> puntuacionesPorProducto(Collection<Valoracion> valoraciones) {
        Map<String, List<Integer>> puntuaciones = new HashMap<>();
        for (Valoracion valoracion : valoraciones) {
            if (valoracion != null && valoracion.productoId() != null) {
                puntuaciones.computeIfAbsent(valoracion.productoId(), id -> new ArrayList<>())
                        .add(valoracion.puntuacion());
            }
        }
        return puntuaciones;
    }

    // Valoración media y número de valoraciones de cada producto (media null si no tiene ninguna)
    static List<ProductoValoracionResponse> valoracionesPorProducto(
            Collection<Producto> productos,
            Map<String, List<Integer>> puntuaciones) {

        return productos.stream()
                .map(producto -> {
                    List<Integer> delProducto = puntuaciones.getOrDefault(producto.getId(), List.of());
                    return new ProductoValoracionResponse(
                            producto.getId(),
                            producto.getNombre(),
                            producto.getVendedor(),
                            media(delProducto),
                            delProducto.size());
                })
                .toList();
    }

    // Top 10 mejor valorados: solo los productos con alguna valoración, de mayor a menor media
    static List<ProductoValoracionResponse> mejorValorados(List<ProductoValoracionResponse> valoraciones) {
        return valoraciones.stream()
                .filter(CalculoEstadisticas::tieneValoraciones)
                .sorted(Comparator.comparing(ProductoValoracionResponse::valoracionMedia).reversed()
                        .thenComparing(DESEMPATE_VALORACION))
                .limit(TAMANO_RANKING)
                .toList();
    }

    // Top 10 peor valorados: solo los productos con alguna valoración, de menor a mayor media
    static List<ProductoValoracionResponse> peorValorados(List<ProductoValoracionResponse> valoraciones) {
        return valoraciones.stream()
                .filter(CalculoEstadisticas::tieneValoraciones)
                .sorted(Comparator.comparing(ProductoValoracionResponse::valoracionMedia)
                        .thenComparing(DESEMPATE_VALORACION))
                .limit(TAMANO_RANKING)
                .toList();
    }

    // Catálogo completo ordenado por nombre, para encontrar fácilmente cada producto
    static List<ProductoValoracionResponse> porNombre(List<ProductoValoracionResponse> valoraciones) {
        return valoraciones.stream().sorted(POR_NOMBRE_VALORACION).toList();
    }

    // Todas las puntuaciones juntas: la media de una tienda es la de todas sus valoraciones,
    // no la media de las medias de sus productos
    static List<Integer> todasLasPuntuaciones(Map<String, List<Integer>> puntuacionesPorProducto) {
        return puntuacionesPorProducto.values().stream().flatMap(List::stream).toList();
    }

    static boolean tieneValoraciones(ProductoValoracionResponse valoracion) {
        return valoracion.numeroValoraciones() > 0;
    }

    // Media redondeada a dos decimales; null si no hay puntuaciones
    static Double media(Collection<Integer> puntuaciones) {
        if (puntuaciones.isEmpty()) {
            return null;
        }
        double promedio = puntuaciones.stream().mapToInt(Integer::intValue).average().orElse(0.0);
        return BigDecimal.valueOf(promedio).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    static List<String> identificadores(Collection<Producto> productos) {
        return productos.stream().map(Producto::getId).toList();
    }
}
