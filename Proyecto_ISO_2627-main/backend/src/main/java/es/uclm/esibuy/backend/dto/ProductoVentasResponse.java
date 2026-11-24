package es.uclm.esibuy.backend.dto;

// Estadísticas de ventas: unidades vendidas de un producto en pedidos finalizados.
public record ProductoVentasResponse(
        String productoId,
        String nombre,
        String vendedor,
        int unidadesVendidas) {
}
