package es.uclm.esibuy.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarContrasenaRequest(
        @NotBlank @Size(max = 128) String contrasenaActual,
        @NotBlank @Size(max = 128) String nuevaContrasena) {

    // Las contraseñas no deben aparecer nunca en logs ni en mensajes de error.
    @Override
    public String toString() {
        return "CambiarContrasenaRequest[credentials=REDACTED]";
    }
}
