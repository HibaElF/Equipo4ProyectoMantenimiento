package es.uclm.esibuy.backend.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// Límite general de la API: la clave es el usuario autenticado o, si es anónimo, la IP. Responde 429
// con Retry-After. Quedan fuera las peticiones que el frontend hace de forma legítima y muy
// frecuente (comprobar la sesión, pedir el token CSRF) y las imágenes estáticas de producto.
public class LimiteApiFilter extends OncePerRequestFilter {

	private static final Logger LOGGER = LoggerFactory.getLogger(LimiteApiFilter.class);

	static final String MENSAJE_LIMITE = "Demasiadas peticiones. Inténtalo de nuevo en %d segundos.";

	// Se compara la ruta decodificada, igual que en la autorización y en el resto de filtros.
	private static final RequestMatcher RUTAS_EXCLUIDAS = new OrRequestMatcher(
			PathPatternRequestMatcher.pathPattern("/usuarios/csrf"),
			PathPatternRequestMatcher.pathPattern("/usuarios/sesion-actual"),
			PathPatternRequestMatcher.pathPattern("/product-images/**"));

	private final LimiteApiService limite;

	public LimiteApiFilter(LimiteApiService limite) {
		this.limite = limite;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return HttpMethod.OPTIONS.matches(request.getMethod()) || RUTAS_EXCLUIDAS.matches(request);
	}

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		LimiteApiService.Resultado resultado = limite.registrar(clave(request));
		if (resultado.permitida()) {
			filterChain.doFilter(request, response);
			return;
		}

		// Sin la clave en el log: puede ser un correo. El contexto (IP, correlationId) ya va en el MDC.
		LOGGER.warn("Límite de peticiones superado; se responde 429.");
		response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
		response.setHeader(HttpHeaders.RETRY_AFTER, Integer.toString(resultado.retryAfterSegundos()));
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write("{\"error\":\""
				+ String.format(MENSAJE_LIMITE, resultado.retryAfterSegundos()) + "\"}");
	}

	private static String clave(HttpServletRequest request) {
		Authentication autenticacion = SecurityContextHolder.getContext().getAuthentication();
		if (autenticacion != null
				&& autenticacion.isAuthenticated()
				&& !(autenticacion instanceof AnonymousAuthenticationToken)) {
			return "usuario:" + autenticacion.getName();
		}
		return "ip:" + request.getRemoteAddr();
	}
}
