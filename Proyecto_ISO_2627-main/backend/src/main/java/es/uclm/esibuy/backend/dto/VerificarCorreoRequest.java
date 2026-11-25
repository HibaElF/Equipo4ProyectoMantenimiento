package es.uclm.esibuy.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VerificarCorreoRequest(@NotBlank @Size(max = 128) String token) {

    // El token es un secreto de un solo uso: no debe aparecer en logs ni en mensajes de error.
    @Override
    public String toString() {
        return "VerificarCorreoRequest[token=REDACTED]";
    }
}
