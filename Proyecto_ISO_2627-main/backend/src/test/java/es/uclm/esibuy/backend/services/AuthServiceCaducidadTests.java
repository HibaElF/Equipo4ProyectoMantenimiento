package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.AccountPendingException;
import es.uclm.esibuy.backend.exceptions.ContrasenaCaducadaException;
import es.uclm.esibuy.backend.model.Cliente;

// Caducidad de contraseñas (T-06) con un reloj controlado.
class AuthServiceCaducidadTests {

    private static final String CORREO = "cliente@example.com";
    private static final String CONTRASENA = "ClaveSegura9!";
    private static final Instant AHORA = Instant.parse("2026-11-20T10:00:00Z");

    private final UsuarioDAO usuarioDAO = mock(UsuarioDAO.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final LoginAttemptService intentos = mock(LoginAttemptService.class);
    private final AuditoriaService auditoria = mock(AuditoriaService.class);
    private final AvisoBloqueoService aviso = mock(AvisoBloqueoService.class);
    private AuthService servicio;
    private Cliente cliente;

    @BeforeEach
    void preparar() {
        servicio = servicioConPlazo(Duration.ofDays(30));
        cliente = new Cliente();
        cliente.setId("cliente-1");
        cliente.setEmail(CORREO);
        cliente.setContrasenaHash("hash");
        cliente.setActivada(true);
        when(usuarioDAO.findByEmail(CORREO)).thenReturn(Optional.of(cliente));
        when(encoder.matches(CONTRASENA, "hash")).thenReturn(true);
        when(intentos.registrarFalloDetallado(anyString()))
                .thenReturn(es.uclm.esibuy.backend.dao.ResultadoFalloLogin.SIN_BLOQUEO);
    }

    private AuthService servicioConPlazo(Duration plazo) {
        return new AuthService(usuarioDAO, encoder, intentos, auditoria, aviso,
                Clock.fixed(AHORA, ZoneOffset.UTC), plazo);
    }

    private void cambiadaHaceDias(long dias) {
        cliente.setContrasenaCambiadaEn(AHORA.minus(Duration.ofDays(dias)));
    }

    @Test
    void conLaContrasenaDe29DiasSeAccede() {
        cambiadaHaceDias(29);

        assertSame(cliente, servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));

        verify(intentos).registrarExito(CORREO);
    }

    @Test
    void conLaContrasenaDe31DiasNoSeAccedeYNoCuentaComoFallo() {
        cambiadaHaceDias(31);

        assertThrows(ContrasenaCaducadaException.class, () -> servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));

        verify(intentos, never()).registrarFalloDetallado(anyString());
        verify(auditoria).registrarEvento("login_rechazado", "fallo", "cliente-1",
                Map.of("motivo", "contrasena_caducada"));
    }

    @Test
    void alCumplirExactamenteElPlazoLaContrasenaCaduca() {
        cambiadaHaceDias(30);

        assertThrows(ContrasenaCaducadaException.class, () -> servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));
    }

    @Test
    void elPlazoSeConfiguraPorPropiedad() {
        cambiadaHaceDias(8);

        assertSame(cliente, servicioConPlazo(Duration.ofDays(90)).autenticar(CORREO, CONTRASENA, "127.0.0.1"));
        assertThrows(ContrasenaCaducadaException.class,
                () -> servicioConPlazo(Duration.ofDays(7)).autenticar(CORREO, CONTRASENA, "127.0.0.1"));
    }

    @Test
    void unaCuentaSinFechaEmpiezaAContarEnSuPrimerLoginCorrecto() {
        cliente.setContrasenaCambiadaEn(null);

        assertSame(cliente, servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));

        assertEquals(AHORA, cliente.getContrasenaCambiadaEn());
        verify(usuarioDAO).save(cliente);
    }

    @Test
    void laCaducidadNoSeRevelaConUnaContrasenaIncorrecta() {
        cambiadaHaceDias(100);
        when(encoder.matches("Incorrecta1!", "hash")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> servicio.autenticar(CORREO, "Incorrecta1!", "127.0.0.1"));

        verify(intentos).registrarFalloDetallado(CORREO);
    }

    @Test
    void laCaducidadNoSeRevelaEnUnaCuentaBloqueadaOPendiente() {
        cambiadaHaceDias(100);
        cliente.setBloqueada(true);
        assertThrows(BadCredentialsException.class, () -> servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));

        cliente.setBloqueada(false);
        cliente.setActivada(false);
        assertThrows(AccountPendingException.class, () -> servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));

        verify(auditoria, never()).registrarEvento(anyString(), anyString(), anyString(), any());
    }

    @Test
    void unaCuentaConElCorreoSinVerificarNoEntraAunqueTengaLasCredencialesCorrectas() {
        cambiadaHaceDias(1);
        cliente.setCorreoVerificado(false);

        assertThrows(es.uclm.esibuy.backend.exceptions.CorreoNoVerificadoException.class,
                () -> servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));

        verify(intentos, never()).registrarExito(anyString());
    }

    @Test
    void elEstadoDelCorreoNoSeRevelaConUnaContrasenaIncorrectaNiEnCuentasBloqueadas() {
        cambiadaHaceDias(1);
        cliente.setCorreoVerificado(false);
        when(encoder.matches("Incorrecta1!", "hash")).thenReturn(false);
        assertThrows(BadCredentialsException.class, () -> servicio.autenticar(CORREO, "Incorrecta1!", "127.0.0.1"));

        cliente.setBloqueada(true);
        assertThrows(BadCredentialsException.class, () -> servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));
    }

    @Test
    void lasCuentasAnterioresSinElCampoSeConsideranVerificadasYUnaVerificadaEntra() {
        cambiadaHaceDias(1);
        assertSame(cliente, servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));

        cliente.setCorreoVerificado(true);
        assertSame(cliente, servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1"));
    }

    @Test
    void sinCaducarNoSeGuardaLaCuentaPorLaCaducidad() {
        cambiadaHaceDias(1);

        servicio.autenticar(CORREO, CONTRASENA, "127.0.0.1");

        verify(usuarioDAO, never()).save(any());
    }
}
