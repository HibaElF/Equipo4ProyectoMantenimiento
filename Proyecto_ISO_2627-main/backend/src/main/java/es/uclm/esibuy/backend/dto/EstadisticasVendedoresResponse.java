package es.uclm.esibuy.backend.dto;

import java.util.List;

// Top 10 de vendedores por valoración media. Los vendedores activos que aún no tienen valoraciones no entran en
// el ranking: se devuelven aparte para indicarlo. El aviso explica cuándo no hay datos suficientes (si no, null).
public record EstadisticasVendedoresResponse(
        List<VendedorValoracionResponse> ranking,
        List<String> vendedoresSinValoraciones,
        String aviso) {
}
