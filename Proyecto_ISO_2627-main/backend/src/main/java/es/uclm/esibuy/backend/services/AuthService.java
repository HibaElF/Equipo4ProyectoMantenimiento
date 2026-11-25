package es.uclm.esibuy.backend.services;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.ResultadoFalloLogin;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.AccountPendingException;
import es.uclm.esibuy.backend.exceptions.ContrasenaCaducadaException;
import es.uclm.esibuy.backend.exceptions.CorreoNoVerificadoException;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.model.Usuario;

@Service
public class AuthService {

    private static final String MENSAJE_ERROR_CREDENCIALES = "Correo o contraseña incorrectos.";
    private static final SecureRandom GENERADOR_ALEATORIO = new SecureRandom();

    private final UsuarioDAO usuarioDAO;
    private final PasswordEncoder passwordEncoder;
    private final LoginAttemptService loginAttemptService;
    private final AuditoriaService auditoriaService;
    private final AvisoBloqueoService avisoBloqueoService;
    private final Clock clock;
    private final Duration vidaMaximaContrasena;
    private volatile String hashSenuelo;

    public AuthService(
            UsuarioDAO usuarioDAO,
            PasswordEncoder passwordEncoder,
            LoginAttemptService loginAttemptService,
            AuditoriaService auditoriaService,
            AvisoBloqueoService avisoBloqueoService) {
        this(usuarioDAO, passwordEncoder, loginAttemptService, auditoriaService, avisoBloqueoService,
                Clock.systemUTC(), Duration.ofDays(30));
    }

    @Autowired
    public AuthService(
            UsuarioDAO usuarioDAO,
            PasswordEncoder passwordEncoder,
            LoginAttemptService loginAttemptService,
            AuditoriaService auditoriaService,
            AvisoBloqueoService avisoBloqueoService,
            @Value("${app.security.password.max-age:30d}") Duration vidaMaximaContrasena) {
        this(usuarioDAO, passwordEncoder, loginAttemptService, auditoriaService, avisoBloqueoService,
                Clock.systemUTC(), vidaMaximaContrasena);
    }

    // Con reloj inyectable para poder probar la caducidad con una hora controlada.
    public AuthService(
            UsuarioDAO usuarioDAO,
            PasswordEncoder passwordEncoder,
            LoginAttemptService loginAttemptService,
            AuditoriaService auditoriaService,
            AvisoBloqueoService avisoBloqueoService,
            Clock clock,
            Duration vidaMaximaContrasena) {
        this.usuarioDAO = usuarioDAO;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptService = loginAttemptService;
        this.auditoriaService = auditoriaService;
        this.avisoBloqueoService = avisoBloqueoService;
        this.clock = clock;
        this.vidaMaximaContrasena = vidaMaximaContrasena;
    }

    public Usuario autenticar(String correo, String contrasena, String ip) {
        if (correo == null || contrasena == null) {
            throw new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES);
        }

        String correoNormalizado = correo.trim().toLowerCase(Locale.ROOT);
        try {
            loginAttemptService.reservarIntento(ip, correoNormalizado);
        } catch (LoginRateLimitException exception) {
            auditoriaService.registrarBloqueoLogin(exception.getRetryAfterSeconds());
            throw exception;
        }
        Usuario usuario = usuarioDAO.findByEmail(correoNormalizado)
                .orElse(null);

        boolean credencialesValidas;
        if (usuario == null || usuario.getContrasenaHash() == null) {
            // Se ejecuta bcrypt igualmente para que el tiempo de respuesta no revele si la cuenta existe.
            passwordEncoder.matches(contrasena, hashSenuelo());
            credencialesValidas = false;
        } else {
            credencialesValidas = passwordEncoder.matches(contrasena, usuario.getContrasenaHash());
        }

        if (!credencialesValidas) {
            rechazarCredencialesInvalidas(usuario, correoNormalizado);
        }

        if (passwordEncoder.upgradeEncoding(usuario.getContrasenaHash())) {
            usuario.actualizarContrasenaHash(passwordEncoder.encode(contrasena));
            usuarioDAO.save(usuario);
        }

        comprobarEstadoCuenta(usuario);

        comprobarCaducidadContrasena(usuario, correoNormalizado);

        loginAttemptService.registrarExito(correoNormalizado);
        return usuario;
    }

    // Registra el fallo y siempre lanza: LoginRateLimitException si ya hay bloqueo, o credenciales inválidas.
    // El usuario puede ser null (correo inexistente): en ese caso no se avisa a nadie.
    private void rechazarCredencialesInvalidas(Usuario usuario, String correoNormalizado) {
        ResultadoFalloLogin fallo = loginAttemptService.registrarFalloDetallado(correoNormalizado);
        int retryAfter = fallo.retryAfter();
        auditoriaService.registrarIntentoLoginFallido();
        if (retryAfter > 0) {
            auditoriaService.registrarBloqueoLogin(retryAfter);
            // Solo se avisa si la cuenta existe y este fallo ha creado el bloqueo; con un correo
            // inexistente no ocurre nada distinto.
            if (fallo.nuevoBloqueo() && usuario != null) {
                avisoBloqueoService.avisar(usuario, retryAfter);
            }
            throw new LoginRateLimitException(retryAfter);
        }
        throw new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES);
    }

    // Solo tras acertar las credenciales: no se revela el estado de la cuenta a un tercero.
    private void comprobarEstadoCuenta(Usuario usuario) {
        if (usuario.isBloqueada()) {
            throw new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES);
        }
        if (!usuario.isCorreoVerificado()) {
            throw new CorreoNoVerificadoException();
        }
        if (!usuario.isActivada()) {
            throw new AccountPendingException();
        }
    }

    // Solo se evalúa con credenciales correctas y cuenta usable, para no revelar la caducidad a un tercero.
    // Las cuentas sin fecha (anteriores a esta medida) empiezan a contar en su primer login correcto.
    private void comprobarCaducidadContrasena(Usuario usuario, String correoNormalizado) {
        if (usuario.getContrasenaCambiadaEn() == null) {
            usuario.setContrasenaCambiadaEn(clock.instant());
            usuarioDAO.save(usuario);
            return;
        }
        if (!clock.instant().isBefore(usuario.getContrasenaCambiadaEn().plus(vidaMaximaContrasena))) {
            // Las credenciales eran correctas: no cuenta como intento fallido.
            loginAttemptService.registrarExito(correoNormalizado);
            auditoriaService.registrarEvento("login_rechazado", "fallo", usuario.getId(),
                    Map.of("motivo", "contrasena_caducada"));
            throw new ContrasenaCaducadaException();
        }
    }

    // Se invoca cuando el login queda completo (tras los factores adicionales, si los hay).
    public void registrarLoginCompletado(Usuario usuario) {
        auditoriaService.registrarLoginCorrecto(usuario.getEmail(), usuario.getId());
    }

    private String hashSenuelo() {
        String hash = hashSenuelo;
        if (hash == null) {
            synchronized (this) {
                hash = hashSenuelo;
                if (hash == null) {
                    byte[] aleatorio = new byte[24];
                    GENERADOR_ALEATORIO.nextBytes(aleatorio);
                    hash = passwordEncoder.encode(Base64.getEncoder().encodeToString(aleatorio));
                    hashSenuelo = hash;
                }
            }
        }
        return hash;
    }

    public Usuario buscarPorCorreo(String correo) {
        if (correo == null || correo.isBlank()) {
            throw new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES);
        }
        return usuarioDAO.findByEmail(correo.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES));
    }
}
