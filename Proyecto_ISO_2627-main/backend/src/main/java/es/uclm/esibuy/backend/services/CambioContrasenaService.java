package es.uclm.esibuy.backend.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;
import es.uclm.esibuy.backend.exceptions.InvalidRegistrationException;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Usuario;

// Cambio de contraseña del usuario autenticado. La contraseña actual se comprueba con el mismo
// límite de intentos que el login, para que no sea un vector de fuerza bruta.
@Service
public class CambioContrasenaService {

    static final String MENSAJE_CONTRASENA_ACTUAL_INCORRECTA = "La contraseña actual no es correcta.";
    static final String EVENTO = "cambio_contrasena";

    private final UsuarioDAO usuarioDAO;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final LoginAttemptService loginAttemptService;
    private final AuditoriaService auditoriaService;

    public CambioContrasenaService(
            UsuarioDAO usuarioDAO,
            PasswordEncoder passwordEncoder,
            PasswordPolicy passwordPolicy,
            LoginAttemptService loginAttemptService,
            AuditoriaService auditoriaService) {
        this.usuarioDAO = usuarioDAO;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
        this.loginAttemptService = loginAttemptService;
        this.auditoriaService = auditoriaService;
    }

    public void cambiar(String emailAutenticado, String ip, String contrasenaActual, String nuevaContrasena) {
        if (emailAutenticado == null || emailAutenticado.isBlank()) {
            throw new UsuarioNoEncontradoException();
        }
        String email = emailAutenticado.trim().toLowerCase(Locale.ROOT);

        // Lanza LoginRateLimitException (429) si hay demasiados intentos.
        loginAttemptService.reservarIntento(ip, email);

        Usuario usuario = usuarioDAO.findByEmail(email).orElseThrow(UsuarioNoEncontradoException::new);

        if (usuario.getContrasenaHash() == null
                || !passwordEncoder.matches(contrasenaActual, usuario.getContrasenaHash())) {
            int retryAfter = loginAttemptService.registrarFallo(email);
            auditoriaService.registrarEvento(EVENTO, "fallo", usuario.getId(),
                    Map.of("motivo", "contrasena_actual_incorrecta"));
            if (retryAfter > 0) {
                throw new LoginRateLimitException(retryAfter);
            }
            throw new DatosNoValidosException(MENSAJE_CONTRASENA_ACTUAL_INCORRECTA);
        }

        passwordPolicy.validate(nuevaContrasena, PasswordPolicy.datosPersonalesDe(usuario));

        List<String> hashesRecientes = new ArrayList<>(usuario.getHistorialContrasenasHash());
        String hashActual = usuario.getContrasenaHash();
        if (!hashesRecientes.contains(hashActual)) {
            hashesRecientes.add(hashActual);
        }
        if (passwordPolicy.matchesRecentPassword(nuevaContrasena, hashesRecientes, passwordEncoder)) {
            throw new InvalidRegistrationException(
                    "nuevaContrasena",
                    "No puedes reutilizar una de tus contraseñas recientes.");
        }

        usuario.registrarContrasenaHash(passwordEncoder.encode(nuevaContrasena));
        usuarioDAO.save(usuario);
        loginAttemptService.registrarExito(email);
        auditoriaService.registrarEvento(EVENTO, "exito", usuario.getId(), Map.of());
    }
}
