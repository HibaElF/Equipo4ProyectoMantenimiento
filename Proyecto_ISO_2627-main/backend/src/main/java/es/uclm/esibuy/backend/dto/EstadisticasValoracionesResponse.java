package es.uclm.esibuy.backend.dto;

import java.util.List;

// Top 10 de productos mejor y peor valorados. Solo entran los productos con alguna valoración.
// El aviso explica cuándo no hay valoraciones suficientes (si no, es null).
public record EstadisticasValoracionesResponse(
        List<ProductoValoracionResponse> mejorValorados,
        List<ProductoValoracionResponse> peorValorados,
        String aviso) {
}
