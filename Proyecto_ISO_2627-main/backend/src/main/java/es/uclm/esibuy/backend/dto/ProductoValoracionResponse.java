package es.uclm.esibuy.backend.dto;

// Estadísticas de valoraciones de un producto: media de las puntuaciones (redondeada a dos decimales)
// y número de valoraciones. Si el producto aún no tiene valoraciones, la media es null.
public record ProductoValoracionResponse(
        String productoId,
        String nombre,
        String vendedor,
        Double valoracionMedia,
        int numeroValoraciones) {
}
