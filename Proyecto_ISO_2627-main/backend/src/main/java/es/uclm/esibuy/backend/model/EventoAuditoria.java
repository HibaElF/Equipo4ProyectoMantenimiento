package es.uclm.esibuy.backend.model;

import java.time.Instant;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

// Registro de auditoría de una acción sensible. Sin datos personales: el actor va seudonimizado
// y el objetivo es el identificador interno, nunca un correo. Los documentos solo se insertan.
@Document(collection = "auditoria")
public class EventoAuditoria {

	@Id
	private String id;

	// El índice TTL elimina los registros pasada la retención (app.auditoria.retencion).
	@Indexed(name = "ttl_auditoria_fecha", expireAfter = "${app.auditoria.retencion:365d}")
	private Instant fecha;

	private String tipo;
	private String resultado;
	private String actor;
	private String objetivo;
	private String ip;
	private String correlationId;
	private Map<String, String> detalles;

	public EventoAuditoria() {
	}

	public EventoAuditoria(
			Instant fecha,
			String tipo,
			String resultado,
			String actor,
			String objetivo,
			String ip,
			String correlationId,
			Map<String, String> detalles) {
		this.fecha = fecha;
		this.tipo = tipo;
		this.resultado = resultado;
		this.actor = actor;
		this.objetivo = objetivo;
		this.ip = ip;
		this.correlationId = correlationId;
		this.detalles = detalles;
	}

	public String getId() {
		return id;
	}

	public Instant getFecha() {
		return fecha;
	}

	public String getTipo() {
		return tipo;
	}

	public String getResultado() {
		return resultado;
	}

	public String getActor() {
		return actor;
	}

	public String getObjetivo() {
		return objetivo;
	}

	public String getIp() {
		return ip;
	}

	public String getCorrelationId() {
		return correlationId;
	}

	public Map<String, String> getDetalles() {
		return detalles;
	}
}
