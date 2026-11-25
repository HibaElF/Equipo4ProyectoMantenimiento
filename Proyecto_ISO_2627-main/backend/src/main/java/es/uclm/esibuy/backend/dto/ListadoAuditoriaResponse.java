package es.uclm.esibuy.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import es.uclm.esibuy.backend.model.EventoAuditoria;

public record ListadoAuditoriaResponse(
		List<Evento> eventos,
		int pagina,
		int tamano,
		long total) {

	public record Evento(
			Instant fecha,
			String tipo,
			String resultado,
			String actor,
			String objetivo,
			String ip,
			String correlationId,
			Map<String, String> detalles) {

		public static Evento desde(EventoAuditoria evento) {
			return new Evento(
					evento.getFecha(),
					evento.getTipo(),
					evento.getResultado(),
					evento.getActor(),
					evento.getObjetivo(),
					evento.getIp(),
					evento.getCorrelationId(),
					evento.getDetalles() == null ? Map.of() : evento.getDetalles());
		}
	}
}
