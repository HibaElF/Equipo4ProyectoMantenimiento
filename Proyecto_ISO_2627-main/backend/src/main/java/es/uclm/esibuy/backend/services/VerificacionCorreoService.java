package es.uclm.esibuy.backend.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.TokenVerificacionCorreoDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.TokenVerificacionCorreoInvalidoException;
import es.uclm.esibuy.backend.model.TokenVerificacionCorreo;
import es.uclm.esibuy.backend.model.Usuario;

// Confirmación de la propiedad del correo en el alta pública. Mismo patrón que la recuperación de
// contraseña: token de 32 bytes con SecureRandom, guardado solo como SHA-256, caducidad y consumo atómico.
@Service
public class VerificacionCorreoService {

    static final Duration VALIDEZ_TOKEN = Duration.ofHours(24);

    private static final Logger LOGGER = LoggerFactory.getLogger(VerificacionCorreoService.class);

    private final UsuarioDAO usuarioDAO;
    private final TokenVerificacionCorreoDAO tokenDAO;
    private final BrevoEmailService brevoEmailService;
    private final AuditoriaService auditoriaService;
    private final Clock reloj;
    private final String urlFrontend;
    private final SecureRandom secureRandom = new SecureRandom();

    @Autowired
    public VerificacionCorreoService(
            UsuarioDAO usuarioDAO,
            TokenVerificacionCorreoDAO tokenDAO,
            BrevoEmailService brevoEmailService,
            AuditoriaService auditoriaService,
            @Value("${app.frontend-url:https://localhost:4200}") String urlFrontend) {
        this(usuarioDAO, tokenDAO, brevoEmailService, auditoriaService, urlFrontend, Clock.systemUTC());
    }

    VerificacionCorreoService(
            UsuarioDAO usuarioDAO,
            TokenVerificacionCorreoDAO tokenDAO,
            BrevoEmailService brevoEmailService,
            AuditoriaService auditoriaService,
            String urlFrontend,
            Clock reloj) {
        this.usuarioDAO = usuarioDAO;
        this.tokenDAO = tokenDAO;
        this.brevoEmailService = brevoEmailService;
        this.auditoriaService = auditoriaService;
        this.urlFrontend = quitarBarrasFinales(urlFrontend);
        this.reloj = reloj;
    }

    // Solo para cuentas nuevas. Un fallo aquí nunca debe cambiar la respuesta del registro, que es la
    // misma exista o no el correo.
    public void iniciar(Usuario usuario) {
        try {
            byte[] bytes = new byte[32];
            secureRandom.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            tokenDAO.save(new TokenVerificacionCorreo(
                    calcularHash(token), usuario.getId(), reloj.instant().plus(VALIDEZ_TOKEN)));

            String enlace = urlFrontend + "/verificar-correo?token=" + token;
            brevoEmailService.enviarVerificacionCorreoEnSegundoPlano(usuario.getEmail(), enlace);
        } catch (RuntimeException exception) {
            LOGGER.error("No se pudo iniciar la verificación del correo de una cuenta nueva.", exception);
        }
    }

    public void verificar(String token) {
        TokenVerificacionCorreo guardado = tokenDAO.findByHashToken(calcularHash(token))
                .orElseThrow(TokenVerificacionCorreoInvalidoException::new);
        Instant ahora = reloj.instant();
        if (guardado.isConsumido() || !guardado.getCaducidad().isAfter(ahora)) {
            throw new TokenVerificacionCorreoInvalidoException();
        }

        Usuario usuario = usuarioDAO.findById(guardado.getUsuarioId())
                .orElseThrow(TokenVerificacionCorreoInvalidoException::new);

        if (tokenDAO.consumirSiValido(guardado.getId(), ahora) != 1) {
            throw new TokenVerificacionCorreoInvalidoException();
        }

        usuario.setCorreoVerificado(true);
        usuarioDAO.save(usuario);
        auditoriaService.registrarCorreoVerificado(usuario.getId(), "enlace");
    }

    private static String quitarBarrasFinales(String url) {
        int fin = url.length();
        while (fin > 0 && url.charAt(fin - 1) == '/') {
            fin--;
        }
        return url.substring(0, fin);
    }

    private static String calcularHash(String token) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("No está disponible SHA-256 para validar el token.", exception);
        }
    }
}
