package es.uclm.esibuy.backend.dto;

import java.time.Instant;

import es.uclm.esibuy.backend.model.Alerta;
import es.uclm.esibuy.backend.model.TipoAlerta;

public record AlertaResponse(
        String id,
        TipoAlerta tipo,
        String productoId,
        String mensaje,
        Instant fecha,
        boolean leida) {

    public static AlertaResponse de(Alerta alerta) {
        return new AlertaResponse(
                alerta.getId(),
                alerta.getTipo(),
                alerta.getProductoId(),
                alerta.getMensaje(),
                alerta.getFecha(),
                alerta.isLeida());
    }
}
