package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import es.uclm.esibuy.backend.model.Cliente;

class AvisoBloqueoServiceTests {

    private static final String CORREO = "titular@example.com";

    private final LoginAttemptService intentos = mock(LoginAttemptService.class);
    private final BrevoEmailService correo = mock(BrevoEmailService.class);
    private final AuditoriaService auditoria = mock(AuditoriaService.class);
    private final AvisoBloqueoService servicio = new AvisoBloqueoService(intentos, correo, auditoria);
    private Cliente titular;

    @BeforeEach
    void preparar() {
        titular = new Cliente();
        titular.setId("cliente-1");
        titular.setEmail(CORREO);
    }

    @Test
    void auditaElBloqueoYAvisaAlTitularUnaVez() {
        when(intentos.permitirAvisoBloqueo(CORREO)).thenReturn(true);

        servicio.avisar(titular, 30);

        verify(auditoria).registrarBloqueoCuenta(CORREO, "cliente-1", 30);
        verify(correo).enviarAvisoBloqueoEnSegundoPlano(CORREO);
    }

    @Test
    void respetaElLimiteDeUnAvisoPorHoraPeroSiguePendienteDeAuditar() {
        when(intentos.permitirAvisoBloqueo(CORREO)).thenReturn(false);

        servicio.avisar(titular, 120);

        verify(auditoria).registrarBloqueoCuenta(CORREO, "cliente-1", 120);
        verify(correo, never()).enviarAvisoBloqueoEnSegundoPlano(anyString());
    }

    @Test
    void unFalloEnElEnvioNoAlteraElLogin() {
        when(intentos.permitirAvisoBloqueo(CORREO)).thenReturn(true);
        doThrow(new IllegalStateException("brevo caído")).when(correo).enviarAvisoBloqueoEnSegundoPlano(CORREO);

        assertDoesNotThrow(() -> servicio.avisar(titular, 30));
    }

    @Test
    void unFalloEnLaAuditoriaOElLimiteTampocoAlteraElLogin() {
        doThrow(new IllegalStateException("mongo caído")).when(intentos).permitirAvisoBloqueo(CORREO);

        assertDoesNotThrow(() -> servicio.avisar(titular, 30));

        verify(correo, never()).enviarAvisoBloqueoEnSegundoPlano(anyString());
    }
}
