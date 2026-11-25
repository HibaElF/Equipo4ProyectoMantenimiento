package es.uclm.esibuy.backend.dto;

// Ranking de vendedores: media de todas las valoraciones de los productos del vendedor (redondeada a dos
// decimales), cuántas valoraciones son y cuántos de sus productos tienen alguna.
public record VendedorValoracionResponse(
        String vendedor,
        Double valoracionMedia,
        int numeroValoraciones,
        int productosValorados) {
}
