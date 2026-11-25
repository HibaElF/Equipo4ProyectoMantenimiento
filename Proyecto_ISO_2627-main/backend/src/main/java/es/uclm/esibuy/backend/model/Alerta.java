package es.uclm.esibuy.backend.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

// Aviso para un cliente sobre un producto: bajada de precio, disponibilidad o recomendación.
@Document(collection = "alertas")
public class Alerta {

    @Id
    private String id;

    @Indexed
    private String clienteId;

    private TipoAlerta tipo;
    private String productoId;
    private String mensaje;
    private Instant fecha;
    private boolean leida;

    public Alerta() {
    }

    public Alerta(String clienteId, TipoAlerta tipo, String productoId, String mensaje, Instant fecha) {
        this.clienteId = clienteId;
        this.tipo = tipo;
        this.productoId = productoId;
        this.mensaje = mensaje;
        this.fecha = fecha;
    }

    public String getId() {
        return id;
    }

    public String getClienteId() {
        return clienteId;
    }

    public TipoAlerta getTipo() {
        return tipo;
    }

    public String getProductoId() {
        return productoId;
    }

    public String getMensaje() {
        return mensaje;
    }

    public Instant getFecha() {
        return fecha;
    }

    public boolean isLeida() {
        return leida;
    }

    public void marcarLeida() {
        this.leida = true;
    }
}
