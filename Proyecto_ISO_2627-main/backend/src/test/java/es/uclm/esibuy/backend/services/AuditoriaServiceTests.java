package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.Map;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.slf4j.MDC;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import es.uclm.esibuy.backend.dao.AlmacenAuditoria;
import es.uclm.esibuy.backend.model.EventoAuditoria;
import es.uclm.esibuy.backend.security.Seudonimizador;

@ExtendWith(OutputCaptureExtension.class)
class AuditoriaServiceTests {

    private static final String CORREO = "cliente@example.com";

    private final AlmacenAuditoria almacen = mock(AlmacenAuditoria.class);
    private final Seudonimizador seudonimizador = new Seudonimizador("pepper-falso-solo-para-pruebas-0123456789");
    private final AuditoriaService auditoria = new AuditoriaService(almacen, seudonimizador);

    @AfterEach
    void limpiarContexto() {
        MDC.clear();
    }

    private EventoAuditoria eventoGuardado() {
        ArgumentCaptor<EventoAuditoria> captor = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(almacen).insertar(captor.capture());
        return captor.getValue();
    }

    @Test
    void registraLaSolicitudDeRecuperacionSinDatosPersonales(CapturedOutput salida) {
        auditoria.registrarSolicitudRecuperacion(false);
        auditoria.registrarSolicitudRecuperacion(true);

        assertTrue(salida.getOut().contains(
                "evento_seguridad=recuperacion_solicitada limitada=false"));
        assertTrue(salida.getOut().contains(
                "evento_seguridad=recuperacion_solicitada limitada=true"));
        assertFalse(salida.getOut().contains("@"));
    }

    @Test
    void registraElRestablecimientoConElIdDelUsuario(CapturedOutput salida) {
        auditoria.registrarRestablecimientoContrasena("usuario-1");

        assertTrue(salida.getOut().contains(
                "evento_seguridad=contrasena_restablecida usuario_id=usuario-1 resultado=exito"));
        EventoAuditoria evento = eventoGuardado();
        assertEquals("contrasena_restablecida", evento.getTipo());
        assertEquals("usuario-1", evento.getObjetivo());
    }

    @Test
    void registraFallosYBloqueosDeLoginSinDatosPersonales(CapturedOutput salida) {
        auditoria.registrarIntentoLoginFallido();
        auditoria.registrarBloqueoLogin(30);

        assertTrue(salida.getOut().contains(
                "evento_seguridad=login_fallido resultado=credenciales_invalidas"));
        assertTrue(salida.getOut().contains(
                "evento_seguridad=login_bloqueado retry_after_segundos=30"));
        assertFalse(salida.getOut().contains("@"));
        assertFalse(salida.getOut().contains("192.0.2."));
    }

    @Test
    void registraAltasYEliminacionesAdministrativasSinIdentificadoresPersonales(CapturedOutput salida) {
        auditoria.registrarAltaAdministrador();
        auditoria.registrarEliminacionUsuarioPorAdministrador("ADMINISTRADOR");

        assertTrue(salida.getOut().contains(
                "evento_seguridad=alta_administrador resultado=exito"));
        assertTrue(salida.getOut().contains(
                "evento_seguridad=usuario_eliminado_por_administrador tipo_usuario=ADMINISTRADOR resultado=exito"));
        assertFalse(salida.getOut().contains("@"));
    }

    @Test
    void cadaEventoGuardaFechaActorObjetivoResultadoIpYCorrelationIdDelContexto() {
        MDC.put("usuario", "0123456789abcdef");
        MDC.put("ip", "203.0.113.9");
        MDC.put("correlationId", "abc12345-def6");

        auditoria.registrarUsuarioBloqueado("usuario-7");

        EventoAuditoria evento = eventoGuardado();
        assertEquals("usuario_bloqueado", evento.getTipo());
        assertEquals("exito", evento.getResultado());
        assertEquals("0123456789abcdef", evento.getActor());
        assertEquals("usuario-7", evento.getObjetivo());
        assertEquals("203.0.113.9", evento.getIp());
        assertEquals("abc12345-def6", evento.getCorrelationId());
        assertTrue(evento.getFecha() != null);
    }

    @Test
    void sinContextoElActorEsAnonimoYIpYCorrelationIdUnGuion() {
        auditoria.registrarIntentoLoginFallido();

        EventoAuditoria evento = eventoGuardado();
        assertEquals("anonimo", evento.getActor());
        assertEquals("-", evento.getIp());
        assertEquals("-", evento.getCorrelationId());
        assertEquals("fallo", evento.getResultado());
        assertNull(evento.getObjetivo());
    }

    @Test
    void elLoginCorrectoSeIdentificaConElCorreoSeudonimizadoYNuncaEnClaro(CapturedOutput salida) {
        auditoria.registrarLoginCorrecto(CORREO, "usuario-1");

        EventoAuditoria evento = eventoGuardado();
        assertEquals("login_correcto", evento.getTipo());
        assertEquals(seudonimizador.seudonimizar(CORREO), evento.getActor());
        assertEquals("usuario-1", evento.getObjetivo());
        assertFalse(evento.getActor().contains("cliente"));
        assertFalse(salida.getOut().contains(CORREO));
    }

    @Test
    void registraLosCambiosDeSegundoYTercerFactorSinDatosPersonales(CapturedOutput salida) {
        auditoria.registrarTotpActivado("u1");
        auditoria.registrarTotpDesactivado("u1");
        auditoria.registrarCodigoPorCorreo("u1", true);
        auditoria.registrarCodigoPorCorreo("u1", false);

        ArgumentCaptor<EventoAuditoria> captor = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(almacen, org.mockito.Mockito.times(4)).insertar(captor.capture());
        assertEquals(java.util.List.of("totp_activado", "totp_desactivado",
                "codigo_correo_activado", "codigo_correo_desactivado"),
                captor.getAllValues().stream().map(EventoAuditoria::getTipo).toList());
        assertFalse(salida.getOut().contains("@"));
    }

    @Test
    void registraLaAdministracionDeUsuarios() {
        auditoria.registrarUsuarioActivado("u1");
        auditoria.registrarUsuarioDesbloqueado("u1");
        auditoria.registrarUsuarioModificado("u1");

        ArgumentCaptor<EventoAuditoria> captor = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(almacen, org.mockito.Mockito.times(3)).insertar(captor.capture());
        assertEquals(java.util.List.of("usuario_activado", "usuario_desbloqueado", "usuario_modificado"),
                captor.getAllValues().stream().map(EventoAuditoria::getTipo).toList());
    }

    @Test
    void elEventoGenericoPermiteQueOtrasTareasRegistrenLosSuyos() {
        auditoria.registrarEvento("contrasena_cambiada", "exito", "u1", Map.of("motivo", "usuario"));

        EventoAuditoria evento = eventoGuardado();
        assertEquals("contrasena_cambiada", evento.getTipo());
        assertEquals(Map.of("motivo", "usuario"), evento.getDetalles());
    }

    @Test
    void unFalloAlGuardarNoRompeLaOperacionYQuedaEnElLog(CapturedOutput salida) {
        doThrow(new IllegalStateException("mongo caído")).when(almacen).insertar(any());

        auditoria.registrarUsuarioBloqueado("u1");

        assertTrue(salida.getOut().contains("No se pudo guardar el evento de audit"), salida.getOut());
        assertTrue(salida.getOut().contains("usuario_bloqueado"));
    }
}
