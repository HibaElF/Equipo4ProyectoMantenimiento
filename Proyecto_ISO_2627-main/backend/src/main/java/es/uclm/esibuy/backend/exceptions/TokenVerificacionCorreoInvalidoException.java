package es.uclm.esibuy.backend.exceptions;

// Mensaje único para un enlace inexistente, caducado o ya usado: no se distingue entre ellos.
public class TokenVerificacionCorreoInvalidoException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public TokenVerificacionCorreoInvalidoException() {
        super("El enlace de verificación no es válido o ha caducado.");
    }
}
