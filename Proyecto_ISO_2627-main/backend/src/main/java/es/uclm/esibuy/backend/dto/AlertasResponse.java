package es.uclm.esibuy.backend.dto;

import java.util.List;

public record AlertasResponse(
        List<AlertaResponse> alertas,
        long noLeidas) {
}
