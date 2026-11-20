package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;
import es.uclm.esibuy.backend.exceptions.InvalidRegistrationException;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.security.PepperedBCryptPasswordEncoder;

class CambioContrasenaServiceTests {

    private static final String CORREO = "cliente@example.com";
    private static final String IP = "203.0.113.5";
    private static final String ACTUAL = "ClaveActual9!x";
    private static final String NUEVA = "NuevaClaveSegura7#";

    private final UsuarioDAO usuarioDAO = mock(UsuarioDAO.class);
    private final PasswordEncoder encoder = new PepperedBCryptPasswordEncoder(
            "test-pepper-that-is-never-used-outside-tests-123456", 4);
    private final LoginAttemptService intentos = mock(LoginAttemptService.class);
    private final AuditoriaService auditoria = mock(AuditoriaService.class);
    private CambioContrasenaService servicio;
    private Cliente cliente;

    @BeforeEach
    void preparar() {
        servicio = new CambioContrasenaService(usuarioDAO, encoder, new PasswordPolicy(), intentos, auditoria);
        cliente = new Cliente();
        cliente.setId("cliente-1");
        cliente.setEmail(CORREO);
        cliente.setNombre("Marcelo");
        cliente.setApellidos("Quintanilla");
        cliente.setTelefono("612345678");
        cliente.setDniNif("12345678Z");
        cliente.setFechaNacimiento(LocalDate.of(2000, 5, 17));
        cliente.registrarContrasenaHash(encoder.encode(ACTUAL));
        when(usuarioDAO.findByEmail(CORREO)).thenReturn(Optional.of(cliente));
    }

    @Test
    void conLaContrasenaActualCorrectaGuardaElHashNuevoConPepperYAudita() {
        servicio.cambiar(CORREO, IP, ACTUAL, NUEVA);

        verify(intentos).reservarIntento(IP, CORREO);
        verify(usuarioDAO).save(cliente);
        verify(intentos).registrarExito(CORREO);
        org.junit.jupiter.api.Assertions.assertTrue(cliente.getContrasenaHash().startsWith("{bcrypt-pepper-v1}"));
        org.junit.jupiter.api.Assertions.assertTrue(encoder.matches(NUEVA, cliente.getContrasenaHash()));
        assertEquals(2, cliente.getHistorialContrasenasHash().size());
        verify(auditoria).registrarEvento("cambio_contrasena", "exito", "cliente-1", Map.of());
    }

    @Test
    void normalizaElCorreoDeLaSesion() {
        servicio.cambiar("  Cliente@Example.COM ", IP, ACTUAL, NUEVA);

        verify(intentos).reservarIntento(IP, CORREO);
        verify(usuarioDAO).save(cliente);
    }

    @Test
    void unaContrasenaActualIncorrectaCuentaComoFalloYNoCambiaNada() {
        DatosNoValidosException error = assertThrows(DatosNoValidosException.class,
                () -> servicio.cambiar(CORREO, IP, "OtraClave1!", NUEVA));

        assertEquals("La contraseña actual no es correcta.", error.getMessage());
        verify(intentos).registrarFallo(CORREO);
        verify(usuarioDAO, never()).save(any());
        verify(intentos, never()).registrarExito(anyString());
        verify(auditoria).registrarEvento(eq("cambio_contrasena"), eq("fallo"), eq("cliente-1"),
                eq(Map.of("motivo", "contrasena_actual_incorrecta")));
    }

    @Test
    void siElFalloActivaElBackoffSeDevuelveElLimiteDeIntentos() {
        when(intentos.registrarFallo(CORREO)).thenReturn(30);

        LoginRateLimitException error = assertThrows(LoginRateLimitException.class,
                () -> servicio.cambiar(CORREO, IP, "OtraClave1!", NUEVA));

        assertEquals(30, error.getRetryAfterSeconds());
        verify(usuarioDAO, never()).save(any());
    }

    @Test
    void elLimiteDeIntentosSeComprobaAntesDeTocarLaCuenta() {
        doThrow(new LoginRateLimitException(60)).when(intentos).reservarIntento(IP, CORREO);

        assertThrows(LoginRateLimitException.class, () -> servicio.cambiar(CORREO, IP, ACTUAL, NUEVA));

        verifyNoInteractions(usuarioDAO, auditoria);
    }

    @Test
    void rechazaUnaNuevaContrasenaQueIncumpleLaPolitica() {
        assertThrows(InvalidRegistrationException.class, () -> servicio.cambiar(CORREO, IP, ACTUAL, "corta"));
        assertThrows(InvalidRegistrationException.class, () -> servicio.cambiar(CORREO, IP, ACTUAL, "sinmayusculas1!"));

        verify(usuarioDAO, never()).save(any());
        verify(intentos, never()).registrarFallo(anyString());
    }

    @Test
    void rechazaUnaNuevaContrasenaConDatosPersonales() {
        assertThrows(InvalidRegistrationException.class,
                () -> servicio.cambiar(CORREO, IP, ACTUAL, "Zq!marcelo92"));
        assertThrows(InvalidRegistrationException.class,
                () -> servicio.cambiar(CORREO, IP, ACTUAL, "Zq!12345678Zk"));

        verify(usuarioDAO, never()).save(any());
    }

    @Test
    void rechazaRepetirLaContrasenaActualOUnaDeLasCincoUltimas() {
        assertThrows(InvalidRegistrationException.class, () -> servicio.cambiar(CORREO, IP, ACTUAL, ACTUAL));

        String[] anteriores = { "ClaveVieja1!aa", "ClaveVieja2!bb", "ClaveVieja3!cc" };
        for (String anterior : anteriores) {
            cliente.registrarContrasenaHash(encoder.encode(anterior));
        }
        cliente.registrarContrasenaHash(encoder.encode(ACTUAL));

        InvalidRegistrationException error = assertThrows(InvalidRegistrationException.class,
                () -> servicio.cambiar(CORREO, IP, ACTUAL, "ClaveVieja2!bb"));
        assertEquals("No puedes reutilizar una de tus contraseñas recientes.", error.getMessage());
        verify(usuarioDAO, never()).save(any());
    }

    @Test
    void unaCuentaSinHashNoPuedeCambiarLaContrasena() {
        cliente.setContrasenaHash(null);

        assertThrows(DatosNoValidosException.class, () -> servicio.cambiar(CORREO, IP, ACTUAL, NUEVA));

        verify(intentos).registrarFallo(CORREO);
        verify(usuarioDAO, never()).save(any());
    }

    @Test
    void sinUsuarioAutenticadoNoHaceNada() {
        assertThrows(UsuarioNoEncontradoException.class, () -> servicio.cambiar(null, IP, ACTUAL, NUEVA));
        assertThrows(UsuarioNoEncontradoException.class, () -> servicio.cambiar("  ", IP, ACTUAL, NUEVA));

        verifyNoInteractions(usuarioDAO, intentos, auditoria);
    }

    @Test
    void sinCuentaEnLaBaseDeDatosDevuelveUsuarioNoEncontrado() {
        when(usuarioDAO.findByEmail(CORREO)).thenReturn(Optional.empty());

        assertThrows(UsuarioNoEncontradoException.class, () -> servicio.cambiar(CORREO, IP, ACTUAL, NUEVA));
    }
}
