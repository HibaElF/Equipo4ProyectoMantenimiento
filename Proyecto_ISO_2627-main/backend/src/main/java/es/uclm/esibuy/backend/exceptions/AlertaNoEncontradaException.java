package es.uclm.esibuy.backend.exceptions;

public class AlertaNoEncontradaException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public AlertaNoEncontradaException() {
        super("No se ha encontrado la alerta solicitada.");
    }
}
