package es.uclm.esibuy.backend.services;

import java.time.Instant;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.AlmacenAuditoria;
import es.uclm.esibuy.backend.model.EventoAuditoria;
import es.uclm.esibuy.backend.security.ContextoLogFilter;
import es.uclm.esibuy.backend.security.Seudonimizador;

// Cada evento se escribe en el log (línea evento_seguridad=...) y se guarda en la colección de
// auditoría. Actor, IP y correlationId salen del contexto de la petición (MDC); nunca se guardan
// correos, contraseñas, códigos ni tokens.
@Service
public class AuditoriaService {
    private static final Logger LOGGER = LoggerFactory.getLogger(AuditoriaService.class);

    private static final String EXITO = "exito";
    private static final String FALLO = "fallo";
    private static final String ANONIMO = "anonimo";

    private final AlmacenAuditoria almacen;
    private final Seudonimizador seudonimizador;

    public AuditoriaService(AlmacenAuditoria almacen, Seudonimizador seudonimizador) {
        this.almacen = almacen;
        this.seudonimizador = seudonimizador;
    }

    public void registrarBajaCuenta(String tipoUsuario) {
        LOGGER.info("evento_seguridad=cuenta_eliminada tipo_usuario={} resultado=exito", tipoUsuario);
        persistir("cuenta_eliminada", EXITO, null, null, Map.of("tipo_usuario", String.valueOf(tipoUsuario)));
    }

    public void registrarIntentoLoginFallido() {
        LOGGER.warn("evento_seguridad=login_fallido resultado=credenciales_invalidas");
        persistir("login_fallido", FALLO, null, null, Map.of("motivo", "credenciales_invalidas"));
    }

    public void registrarBloqueoLogin(int retryAfterSeconds) {
        LOGGER.warn("evento_seguridad=login_bloqueado retry_after_segundos={}", retryAfterSeconds);
        persistir("login_bloqueado", FALLO, null, null,
                Map.of("retry_after_segundos", String.valueOf(retryAfterSeconds)));
    }

    // Bloqueo nuevo de una cuenta existente por intentos fallidos. La cuenta va seudonimizada y la IP
    // sale del contexto de la petición; no se guarda el correo.
    public void registrarBloqueoCuenta(String correo, String usuarioId, int retryAfterSeconds) {
        LOGGER.warn("evento_seguridad=bloqueo_cuenta usuario_id={} retry_after_segundos={}",
                usuarioId, retryAfterSeconds);
        persistir("bloqueo_cuenta", FALLO, null, usuarioId,
                Map.of("cuenta", seudonimizador.seudonimizar(correo),
                        "retry_after_segundos", String.valueOf(retryAfterSeconds)));
    }

    public void registrarAltaAdministrador() {
        LOGGER.info("evento_seguridad=alta_administrador resultado=exito");
        persistir("alta_administrador", EXITO, null, null, Map.of());
    }

    public void registrarEliminacionUsuarioPorAdministrador(String tipoUsuario) {
        LOGGER.info("evento_seguridad=usuario_eliminado_por_administrador tipo_usuario={} resultado=exito",
                tipoUsuario);
        persistir("usuario_eliminado_por_administrador", EXITO, null, null,
                Map.of("tipo_usuario", String.valueOf(tipoUsuario)));
    }

    // Sin el correo: el evento no debe revelar a quién se refiere ni si la cuenta existe.
    public void registrarSolicitudRecuperacion(boolean limitada) {
        LOGGER.info("evento_seguridad=recuperacion_solicitada limitada={}", limitada);
        persistir("recuperacion_solicitada", EXITO, null, null, Map.of("limitada", String.valueOf(limitada)));
    }

    public void registrarRestablecimientoContrasena(String usuarioId) {
        LOGGER.info("evento_seguridad=contrasena_restablecida usuario_id={} resultado=exito", usuarioId);
        persistir("contrasena_restablecida", EXITO, null, usuarioId, Map.of());
    }

    // El actor se identifica con el correo (seudonimizado) porque en el login la petición aún es anónima.
    public void registrarLoginCorrecto(String correo, String usuarioId) {
        LOGGER.info("evento_seguridad=login_correcto usuario_id={} resultado=exito", usuarioId);
        persistir("login_correcto", EXITO, seudonimizador.seudonimizar(correo), usuarioId, Map.of());
    }

    public void registrarTotpActivado(String usuarioId) {
        LOGGER.info("evento_seguridad=totp_activado usuario_id={} resultado=exito", usuarioId);
        persistir("totp_activado", EXITO, null, usuarioId, Map.of());
    }

    public void registrarTotpDesactivado(String usuarioId) {
        LOGGER.info("evento_seguridad=totp_desactivado usuario_id={} resultado=exito", usuarioId);
        persistir("totp_desactivado", EXITO, null, usuarioId, Map.of());
    }

    public void registrarCodigoPorCorreo(String usuarioId, boolean activado) {
        LOGGER.info("evento_seguridad=codigo_correo_{} usuario_id={} resultado=exito",
                activado ? "activado" : "desactivado", usuarioId);
        persistir(activado ? "codigo_correo_activado" : "codigo_correo_desactivado", EXITO, null, usuarioId, Map.of());
    }

    public void registrarUsuarioActivado(String usuarioId) {
        LOGGER.info("evento_seguridad=usuario_activado usuario_id={} resultado=exito", usuarioId);
        persistir("usuario_activado", EXITO, null, usuarioId, Map.of());
    }

    public void registrarUsuarioBloqueado(String usuarioId) {
        LOGGER.info("evento_seguridad=usuario_bloqueado usuario_id={} resultado=exito", usuarioId);
        persistir("usuario_bloqueado", EXITO, null, usuarioId, Map.of());
    }

    public void registrarUsuarioDesbloqueado(String usuarioId) {
        LOGGER.info("evento_seguridad=usuario_desbloqueado usuario_id={} resultado=exito", usuarioId);
        persistir("usuario_desbloqueado", EXITO, null, usuarioId, Map.of());
    }

    public void registrarUsuarioModificado(String usuarioId) {
        LOGGER.info("evento_seguridad=usuario_modificado usuario_id={} resultado=exito", usuarioId);
        persistir("usuario_modificado", EXITO, null, usuarioId, Map.of());
    }

    // Para eventos de otras tareas (cambio de contraseña, bloqueo por intentos...). Los detalles
    // no deben llevar datos personales.
    public void registrarEvento(String tipo, String resultado, String objetivo, Map<String, String> detalles) {
        LOGGER.info("evento_seguridad={} resultado={}", tipo, resultado);
        persistir(tipo, resultado, null, objetivo, detalles == null ? Map.of() : detalles);
    }

    // Un fallo al guardar nunca rompe la operación de negocio: queda en el log como error.
    private void persistir(String tipo, String resultado, String actor, String objetivo,
            Map<String, String> detalles) {
        try {
            almacen.insertar(new EventoAuditoria(
                    Instant.now(),
                    tipo,
                    resultado,
                    actor != null ? actor : valorDelContexto(ContextoLogFilter.MDC_USUARIO, ANONIMO),
                    objetivo,
                    valorDelContexto(ContextoLogFilter.MDC_IP, "-"),
                    valorDelContexto(ContextoLogFilter.MDC_CORRELATION_ID, "-"),
                    detalles));
        } catch (RuntimeException exception) {
            LOGGER.error("No se pudo guardar el evento de auditoría {}.", tipo, exception);
        }
    }

    private static String valorDelContexto(String clave, String porDefecto) {
        String valor = MDC.get(clave);
        return valor == null || valor.isBlank() ? porDefecto : valor;
    }
}
