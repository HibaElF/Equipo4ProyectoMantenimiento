package es.uclm.esibuy.backend.exceptions;

public class ClienteConPedidosEnCursoException extends RuntimeException {
    public ClienteConPedidosEnCursoException() {
        super("No puedes darte de baja porque tienes pedidos en curso (pagados o enviados).");
    }
}
