package es.uclm.esibuy.backend.services;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Locale;

import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.AccountPendingException;
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
    private volatile String hashSenuelo;

    public AuthService(
            UsuarioDAO usuarioDAO,
            PasswordEncoder passwordEncoder,
            LoginAttemptService loginAttemptService,
            AuditoriaService auditoriaService) {
        this.usuarioDAO = usuarioDAO;
        this.passwordEncoder = passwordEncoder;
        this.loginAttemptService = loginAttemptService;
        this.auditoriaService = auditoriaService;
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
            int retryAfter = loginAttemptService.registrarFallo(correoNormalizado);
            auditoriaService.registrarIntentoLoginFallido();
            if (retryAfter > 0) {
                auditoriaService.registrarBloqueoLogin(retryAfter);
                throw new LoginRateLimitException(retryAfter);
            }
            throw new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES);
        }

        if (passwordEncoder.upgradeEncoding(usuario.getContrasenaHash())) {
            usuario.actualizarContrasenaHash(passwordEncoder.encode(contrasena));
            usuarioDAO.save(usuario);
        }

        if (usuario.isBloqueada()) {
            throw new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES);
        }

        if (!usuario.isActivada()) {
            throw new AccountPendingException();
        }

        loginAttemptService.registrarExito(correoNormalizado);
        return usuario;
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
