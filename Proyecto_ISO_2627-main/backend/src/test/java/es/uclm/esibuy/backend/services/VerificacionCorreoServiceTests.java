package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import es.uclm.esibuy.backend.dao.TokenVerificacionCorreoDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.TokenVerificacionCorreoInvalidoException;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.TokenVerificacionCorreo;

class VerificacionCorreoServiceTests {

    private static final Instant AHORA = Instant.parse("2026-11-23T10:00:00Z");
    private static final String CORREO = "ada@example.com";

    private final UsuarioDAO usuarioDAO = mock(UsuarioDAO.class);
    private final TokenVerificacionCorreoDAO tokenDAO = mock(TokenVerificacionCorreoDAO.class);
    private final BrevoEmailService correo = mock(BrevoEmailService.class);
    private final AuditoriaService auditoria = mock(AuditoriaService.class);
    private VerificacionCorreoService servicio;
    private Cliente cliente;

    @BeforeEach
    void preparar() {
        servicio = new VerificacionCorreoService(usuarioDAO, tokenDAO, correo, auditoria,
                "https://esibuy.example/", Clock.fixed(AHORA, ZoneOffset.UTC));
        cliente = new Cliente();
        cliente.setId("cliente-1");
        cliente.setEmail(CORREO);
        cliente.setCorreoVerificado(false);
    }

    private static String hash(String valor) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(valor.getBytes(StandardCharsets.UTF_8)));
    }

    private TokenVerificacionCorreo tokenGuardado(String token, Instant caducidad, boolean consumido)
            throws Exception {
        TokenVerificacionCorreo guardado = new TokenVerificacionCorreo(hash(token), "cliente-1", caducidad);
        ReflectionTestUtils.setField(guardado, "id", "token-doc-1");
        ReflectionTestUtils.setField(guardado, "consumido", consumido);
        when(tokenDAO.findByHashToken(hash(token))).thenReturn(Optional.of(guardado));
        return guardado;
    }

    @Test
    void iniciarGuardaSoloElHashConCaducidadDe24HorasYEnviaElEnlaceUnaVez() throws Exception {
        servicio.iniciar(cliente);

        ArgumentCaptor<TokenVerificacionCorreo> guardado = ArgumentCaptor.forClass(TokenVerificacionCorreo.class);
        verify(tokenDAO).save(guardado.capture());
        ArgumentCaptor<String> enlace = ArgumentCaptor.forClass(String.class);
        verify(correo).enviarVerificacionCorreoEnSegundoPlano(eq(CORREO), enlace.capture());

        String prefijo = "https://esibuy.example/verificar-correo?token=";
        assertTrue(enlace.getValue().startsWith(prefijo));
        String token = enlace.getValue().substring(prefijo.length());
        // 32 bytes en Base64 URL sin relleno: 43 caracteres.
        assertEquals(43, token.length());
        assertEquals(hash(token), guardado.getValue().getHashToken());
        assertNotEquals(token, guardado.getValue().getHashToken());
        assertEquals("cliente-1", guardado.getValue().getUsuarioId());
        assertEquals(AHORA.plus(Duration.ofHours(24)), guardado.getValue().getCaducidad());
        assertFalse(guardado.getValue().isConsumido());
    }

    @Test
    void cadaCuentaNuevaRecibeUnTokenDistinto() {
        servicio.iniciar(cliente);
        servicio.iniciar(cliente);

        ArgumentCaptor<String> enlaces = ArgumentCaptor.forClass(String.class);
        verify(correo, org.mockito.Mockito.times(2)).enviarVerificacionCorreoEnSegundoPlano(anyString(), enlaces.capture());
        assertNotEquals(enlaces.getAllValues().get(0), enlaces.getAllValues().get(1));
    }

    @Test
    void unFalloAlIniciarNoRompeElRegistro() {
        doThrow(new IllegalStateException("mongo caído")).when(tokenDAO).save(any());

        servicio.iniciar(cliente);

        verify(correo, never()).enviarVerificacionCorreoEnSegundoPlano(anyString(), anyString());
    }

    @Test
    void unEnlaceValidoMarcaElCorreoComoVerificadoYAudita() throws Exception {
        tokenGuardado("token-valido", AHORA.plusSeconds(60), false);
        when(usuarioDAO.findById("cliente-1")).thenReturn(Optional.of(cliente));
        when(tokenDAO.consumirSiValido(eq("token-doc-1"), eq(AHORA))).thenReturn(1L);

        servicio.verificar("token-valido");

        assertTrue(cliente.isCorreoVerificado());
        verify(usuarioDAO).save(cliente);
        verify(auditoria).registrarCorreoVerificado("cliente-1", "enlace");
    }

    @Test
    void elEnlaceSoloSePuedeUsarUnaVez() throws Exception {
        tokenGuardado("token-usado", AHORA.plusSeconds(60), true);
        when(usuarioDAO.findById("cliente-1")).thenReturn(Optional.of(cliente));

        assertThrows(TokenVerificacionCorreoInvalidoException.class, () -> servicio.verificar("token-usado"));

        assertFalse(cliente.isCorreoVerificado());
        verify(usuarioDAO, never()).save(any());
        verify(tokenDAO, never()).consumirSiValido(anyString(), any());
    }

    @Test
    void siDosPeticionesCompitenSoloUnaConsumeElToken() throws Exception {
        tokenGuardado("token-valido", AHORA.plusSeconds(60), false);
        when(usuarioDAO.findById("cliente-1")).thenReturn(Optional.of(cliente));
        when(tokenDAO.consumirSiValido(eq("token-doc-1"), any(Instant.class))).thenReturn(0L);

        assertThrows(TokenVerificacionCorreoInvalidoException.class, () -> servicio.verificar("token-valido"));

        assertFalse(cliente.isCorreoVerificado());
        verify(usuarioDAO, never()).save(any());
    }

    @Test
    void unEnlaceCaducadoDevuelveElMismoErrorGenerico() throws Exception {
        tokenGuardado("token-caducado", AHORA.minusSeconds(1), false);

        TokenVerificacionCorreoInvalidoException caducado = assertThrows(
                TokenVerificacionCorreoInvalidoException.class, () -> servicio.verificar("token-caducado"));
        TokenVerificacionCorreoInvalidoException inexistente = assertThrows(
                TokenVerificacionCorreoInvalidoException.class, () -> servicio.verificar("token-inexistente"));

        assertEquals(inexistente.getMessage(), caducado.getMessage());
        assertEquals("El enlace de verificación no es válido o ha caducado.", caducado.getMessage());
        verifyNoInteractions(auditoria);
    }

    @Test
    void siLaCuentaYaNoExisteElErrorEsElMismoYNoSeConsumeElToken() throws Exception {
        tokenGuardado("token-valido", AHORA.plusSeconds(60), false);
        when(usuarioDAO.findById("cliente-1")).thenReturn(Optional.empty());

        assertThrows(TokenVerificacionCorreoInvalidoException.class, () -> servicio.verificar("token-valido"));

        verify(tokenDAO, never()).consumirSiValido(anyString(), any());
    }
}
