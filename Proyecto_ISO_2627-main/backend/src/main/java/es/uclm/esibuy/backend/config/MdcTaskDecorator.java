package es.uclm.esibuy.backend.config;

import java.util.Map;

import org.slf4j.MDC;
import org.springframework.core.task.TaskDecorator;

// Copia el MDC del hilo que lanza la tarea al hilo del @Async, para que los logs de
// tareas en segundo plano conserven el correlationId de la petición que las originó.
public class MdcTaskDecorator implements TaskDecorator {

	@Override
	public Runnable decorate(Runnable tarea) {
		Map<String, String> contexto = MDC.getCopyOfContextMap();
		return () -> {
			Map<String, String> anterior = MDC.getCopyOfContextMap();
			restaurar(contexto);
			try {
				tarea.run();
			} finally {
				restaurar(anterior);
			}
		};
	}

	private static void restaurar(Map<String, String> contexto) {
		if (contexto == null) {
			MDC.clear();
		} else {
			MDC.setContextMap(contexto);
		}
	}
}
