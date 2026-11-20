package es.uclm.esibuy.backend.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.model.Usuario;

// Cuando un fallo de login crea un bloqueo en una cuenta existente: lo audita y avisa por correo al
// titular. Solo se llama para cuentas que existen, así que quien ataca con un correo inexistente no
// provoca nada distinto. Un fallo aquí nunca debe alterar la respuesta del login.
@Service
public class AvisoBloqueoService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AvisoBloqueoService.class);

    private final LoginAttemptService loginAttemptService;
    private final BrevoEmailService brevoEmailService;
    private final AuditoriaService auditoriaService;

    public AvisoBloqueoService(
            LoginAttemptService loginAttemptService,
            BrevoEmailService brevoEmailService,
            AuditoriaService auditoriaService) {
        this.loginAttemptService = loginAttemptService;
        this.brevoEmailService = brevoEmailService;
        this.auditoriaService = auditoriaService;
    }

    public void avisar(Usuario usuario, int retryAfterSeconds) {
        try {
            auditoriaService.registrarBloqueoCuenta(usuario.getEmail(), usuario.getId(), retryAfterSeconds);
            // Como máximo un correo por hora y cuenta, para no inundar al titular.
            if (loginAttemptService.permitirAvisoBloqueo(usuario.getEmail())) {
                brevoEmailService.enviarAvisoBloqueoEnSegundoPlano(usuario.getEmail());
            }
        } catch (RuntimeException exception) {
            LOGGER.error("No se pudo gestionar el aviso de bloqueo de cuenta.", exception);
        }
    }
}
