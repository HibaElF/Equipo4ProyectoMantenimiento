package es.uclm.esibuy.backend.services;

import java.util.Locale;

import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class SesionService {

	private final SessionRegistry sessionRegistry;

	public SesionService(SessionRegistry sessionRegistry) {
		this.sessionRegistry = sessionRegistry;
	}

	public void registrarSesion(String idSesion, String email) {
		sessionRegistry.registerNewSession(idSesion, normalizar(email));
	}

	public void cerrarSesiones(String email) {
		if (email == null || email.isBlank()) {
			return;
		}
		sessionRegistry.getAllSessions(normalizar(email), false)
				.forEach(SessionInformation::expireNow);
	}

	// Al cambiar las credenciales o los factores de autenticación: rota el identificador de la
	// sesión actual, lo registra y cierra todas las demás sesiones del usuario.
	public void rotarSesion(HttpServletRequest request, String email) {
		if (request.getSession(false) == null) {
			cerrarSesiones(email);
			return;
		}
		String idNuevo = request.changeSessionId();
		registrarSesion(idNuevo, email);
		cerrarOtrasSesiones(email, idNuevo);
	}

	// Expira todas las sesiones del usuario salvo la indicada (la que acaba de cambiar sus credenciales).
	public void cerrarOtrasSesiones(String email, String idSesionActual) {
		if (email == null || email.isBlank()) {
			return;
		}
		sessionRegistry.getAllSessions(normalizar(email), false).stream()
				.filter(sesion -> !sesion.getSessionId().equals(idSesionActual))
				.forEach(SessionInformation::expireNow);
	}

	private String normalizar(String email) {
		return email.trim().toLowerCase(Locale.ROOT);
	}
}