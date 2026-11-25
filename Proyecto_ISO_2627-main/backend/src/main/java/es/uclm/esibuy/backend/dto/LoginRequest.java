package es.uclm.esibuy.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import es.uclm.esibuy.backend.validation.PatronesEntrada;

public record LoginRequest(
        @NotBlank @Email @Size(max = PatronesEntrada.MAX_EMAIL) String email,
        @NotBlank @Size(max = PatronesEntrada.MAX_CONTRASENA) String password) {
    @Override
    public String toString() {
        return "LoginRequest[credentials=REDACTED]";
    }
}
