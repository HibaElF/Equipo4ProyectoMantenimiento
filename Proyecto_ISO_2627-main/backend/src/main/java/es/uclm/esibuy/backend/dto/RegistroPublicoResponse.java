package es.uclm.esibuy.backend.dto;

public record RegistroPublicoResponse(String mensaje) {
    public static RegistroPublicoResponse confirmacion() {
        return new RegistroPublicoResponse(
                "Si la solicitud puede tramitarse, te enviaremos un correo para confirmar tu dirección y el equipo administrador revisará los datos antes de activar la cuenta.");
    }
}