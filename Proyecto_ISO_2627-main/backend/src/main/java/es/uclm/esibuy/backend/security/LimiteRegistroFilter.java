package es.uclm.esibuy.backend.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Set;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import es.uclm.esibuy.backend.dao.LoginAttemptStore;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Límite de altas públicas por IP (persistente en MongoDB, válido con varias instancias). Cada alta
// ejecuta un bcrypt y crea un usuario pendiente, así que un cliente automatizado podría consumir CPU y
// llenar la colección. Va después de la comprobación CSRF: una petición sin token se rechaza con un
// 403 barato y no consume cupo. Cuenta por IP, nunca por correo, así que no revela si un correo existe
// ni cambia la respuesta 202 uniforme de los registros válidos.
public class LimiteRegistroFilter extends OncePerRequestFilter {

	private static final Logger LOGGER = LoggerFactory.getLogger(LimiteRegistroFilter.class);

	static final Set<String> RUTAS = Set.of("/cliente/register", "/vendedor/register");
	static final String TIPO_LIMITE = "registro-ip";
	static final String MENSAJE_LIMITE =
			"Demasiados intentos de registro desde esta conexión. Inténtalo de nuevo en %d segundos.";

	private final Supplier<LoginAttemptStore> almacen;
	private final int maximoAltas;
	private final int ventanaSegundos;

	// El almacén llega como proveedor: si no está disponible (por ejemplo en pruebas de la capa web sin
	// base de datos) no se limita. En la aplicación real siempre está presente.
	public LimiteRegistroFilter(Supplier<LoginAttemptStore> almacen, int maximoAltas, int ventanaSegundos) {
		this.almacen = almacen;
		this.maximoAltas = maximoAltas;
		this.ventanaSegundos = ventanaSegundos;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !HttpMethod.POST.matches(request.getMethod()) || !RUTAS.contains(request.getRequestURI());
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		LoginAttemptStore store = almacen.get();
		if (store == null) {
			filterChain.doFilter(request, response);
			return;
		}

		int espera = store.reservar(TIPO_LIMITE, request.getRemoteAddr(), Instant.now(), ventanaSegundos, maximoAltas);
		if (espera <= 0) {
			filterChain.doFilter(request, response);
			return;
		}

		// Sin la IP en el log: el contexto (IP, correlationId) ya va en el MDC de la petición.
		LOGGER.warn("Límite de altas públicas superado; se responde 429.");
		response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
		response.setHeader(HttpHeaders.RETRY_AFTER, Integer.toString(espera));
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write("{\"error\":\"" + String.format(MENSAJE_LIMITE, espera) + "\"}");
	}
}
