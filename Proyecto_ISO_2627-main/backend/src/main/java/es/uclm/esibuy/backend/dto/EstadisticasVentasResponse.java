package es.uclm.esibuy.backend.dto;

import java.util.List;

// Top 10 de productos más y menos vendidos. El aviso explica cuándo no hay datos suficientes (si no, es null).
public record EstadisticasVentasResponse(
        List<ProductoVentasResponse> masVendidos,
        List<ProductoVentasResponse> menosVendidos,
        String aviso) {
}
