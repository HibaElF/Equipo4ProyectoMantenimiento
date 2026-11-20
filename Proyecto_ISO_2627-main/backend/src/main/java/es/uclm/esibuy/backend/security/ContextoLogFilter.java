package es.uclm.esibuy.backend.security;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.MDC;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Rellena el MDC con el contexto de la petición para que cada línea de log pueda correlacionarse
// sin incluir datos personales: el usuario va seudonimizado y el endpoint sin parámetros.
public class ContextoLogFilter extends OncePerRequestFilter {

	public static final String CABECERA_CORRELACION = "X-Correlation-Id";
	public static final String MDC_CORRELATION_ID = "correlationId";
	public static final String MDC_USUARIO = "usuario";
	public static final String MDC_IP = "ip";
	public static final String MDC_USER_AGENT = "userAgent";
	public static final String MDC_METODO = "metodo";
	public static final String MDC_ENDPOINT = "endpoint";

	private static final Pattern CORRELACION_VALIDA = Pattern.compile("[A-Za-z0-9-]{8,64}");
	private static final int LONGITUD_MAXIMA_CAMPO = 200;

	private final Seudonimizador seudonimizador;

	public ContextoLogFilter(Seudonimizador seudonimizador) {
		this.seudonimizador = seudonimizador;
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String correlationId = obtenerCorrelationId(request.getHeader(CABECERA_CORRELACION));
		try {
			MDC.put(MDC_CORRELATION_ID, correlationId);
			MDC.put(MDC_USUARIO, usuarioSeudonimizado());
			MDC.put(MDC_IP, saneado(request.getRemoteAddr()));
			MDC.put(MDC_USER_AGENT, saneado(request.getHeader("User-Agent")));
			MDC.put(MDC_METODO, saneado(request.getMethod()));
			MDC.put(MDC_ENDPOINT, saneado(request.getRequestURI()));
			response.setHeader(CABECERA_CORRELACION, correlationId);

			filterChain.doFilter(request, response);
		} finally {
			MDC.remove(MDC_CORRELATION_ID);
			MDC.remove(MDC_USUARIO);
			MDC.remove(MDC_IP);
			MDC.remove(MDC_USER_AGENT);
			MDC.remove(MDC_METODO);
			MDC.remove(MDC_ENDPOINT);
		}
	}

	// Un identificador enviado por el cliente solo se acepta si tiene un formato estricto:
	// así no puede inyectar saltos de línea ni contenido arbitrario en los logs.
	static String obtenerCorrelationId(String recibido) {
		if (recibido != null && CORRELACION_VALIDA.matcher(recibido).matches()) {
			return recibido;
		}
		return UUID.randomUUID().toString();
	}

	private String usuarioSeudonimizado() {
		Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
		if (autenticacion == null
				|| !autenticacion.isAuthenticated()
				|| autenticacion instanceof AnonymousAuthenticationToken) {
			return "anonimo";
		}
		return seudonimizador.seudonimizar(autenticacion.getName());
	}

	// Sin caracteres de control (saltos de línea incluidos) y con longitud limitada.
	static String saneado(String valor) {
		if (valor == null || valor.isEmpty()) {
			return "-";
		}
		String sinControl = valor.replaceAll("\\p{Cntrl}", "_");
		return sinControl.length() > LONGITUD_MAXIMA_CAMPO
				? sinControl.substring(0, LONGITUD_MAXIMA_CAMPO)
				: sinControl;
	}
}
