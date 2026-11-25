package es.uclm.esibuy.backend.controllers;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.servlet.ModelAndView;

import es.uclm.esibuy.backend.security.ContextoLogFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Último recurso: responde 500 con un mensaje genérico a cualquier excepción que no haya tratado
// ningún @RestControllerAdvice ni Spring MVC. Va al final de la cadena de resolutores, así que no
// altera los manejadores específicos ni las respuestas propias de Spring MVC (400, 404, 405...).
@Component
public class ManejadorErroresInesperados implements HandlerExceptionResolver, Ordered {

	static final String MENSAJE_ERROR_INTERNO =
			"Se ha producido un error interno. Inténtalo de nuevo más tarde.";

	private static final Logger LOGGER = LoggerFactory.getLogger(ManejadorErroresInesperados.class);

	@Override
	public int getOrder() {
		return Ordered.LOWEST_PRECEDENCE;
	}

	@Override
	public ModelAndView resolveException(
			HttpServletRequest request,
			HttpServletResponse response,
			Object handler,
			Exception exception) {
		// Spring Security responde 401 o 403 a estas dos: no se convierten en un 500.
		if (esDeSeguridad(exception)) {
			return null;
		}

		// La causa completa solo va al log, con el correlationId para localizarla.
		LOGGER.error("Error inesperado al procesar la petición.", exception);
		String correlationId = MDC.get(ContextoLogFilter.MDC_CORRELATION_ID);
		try {
			response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			response.setCharacterEncoding(StandardCharsets.UTF_8.name());
			response.getWriter().write(cuerpo(correlationId));
		} catch (IOException ioException) {
			LOGGER.warn("No se pudo escribir la respuesta de error.", ioException);
		}
		return new ModelAndView();
	}

	// El mensaje es constante y el correlationId ya está validado por el filtro de contexto
	// (solo letras, números y guiones), así que no hace falta escapar nada.
	static String cuerpo(String correlationId) {
		String id = correlationId == null ? "" : correlationId;
		return "{\"error\":\"" + MENSAJE_ERROR_INTERNO + "\",\"correlationId\":\"" + id + "\"}";
	}

	private static boolean esDeSeguridad(Throwable exception) {
		for (Throwable actual = exception; actual != null; actual = actual.getCause()) {
			if (actual instanceof AccessDeniedException || actual instanceof AuthenticationException) {
				return true;
			}
			if (actual.getCause() == actual) {
				break;
			}
		}
		return false;
	}
}
