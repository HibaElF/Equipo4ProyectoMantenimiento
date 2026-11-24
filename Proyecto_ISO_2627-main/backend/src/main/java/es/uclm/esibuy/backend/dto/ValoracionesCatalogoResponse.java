package es.uclm.esibuy.backend.dto;

import java.util.List;

// Valoración media de cada producto del catálogo del vendedor, también de los que no tienen valoraciones,
// y la valoración media de la tienda: media de todas las valoraciones de sus productos (null si no hay ninguna).
public record ValoracionesCatalogoResponse(
        Double valoracionMediaGlobal,
        int numeroValoraciones,
        List<ProductoValoracionResponse> productos) {
}
