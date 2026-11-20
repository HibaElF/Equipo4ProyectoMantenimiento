package es.uclm.esibuy.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

class ContextoLogFilterTests {

    private static final String PEPPER = "pepper-falso-solo-para-pruebas-0123456789";
    private static final String CORREO = "cliente@example.com";

    private final Seudonimizador seudonimizador = new Seudonimizador(PEPPER);
    private final ContextoLogFilter filtro = new ContextoLogFilter(seudonimizador);

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
        MDC.clear();
    }

    @Test
    void rellenaElMdcDuranteLaPeticionYLoVaciaAlTerminar() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(
                        CORREO, null, AuthorityUtils.createAuthorityList("ROLE_CLIENTE")));
        MockHttpServletRequest peticion = new MockHttpServletRequest("POST", "/usuarios/login");
        peticion.setQueryString("correo=otro@example.com&token=secreto");
        peticion.setRemoteAddr("203.0.113.9");
        peticion.addHeader("User-Agent", "Navegador/1.0");
        peticion.addHeader("X-Correlation-Id", "abc12345-def6");
        MockHttpServletResponse respuesta = new MockHttpServletResponse();
        Map<String, String> visto = new HashMap<>();

        filtro.doFilter(peticion, respuesta, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
                visto.putAll(MDC.getCopyOfContextMap());
            }
        });

        assertEquals("abc12345-def6", visto.get(ContextoLogFilter.MDC_CORRELATION_ID));
        assertEquals("203.0.113.9", visto.get(ContextoLogFilter.MDC_IP));
        assertEquals("Navegador/1.0", visto.get(ContextoLogFilter.MDC_USER_AGENT));
        assertEquals("POST", visto.get(ContextoLogFilter.MDC_METODO));
        assertEquals("/usuarios/login", visto.get(ContextoLogFilter.MDC_ENDPOINT));
        assertEquals(seudonimizador.seudonimizar(CORREO), visto.get(ContextoLogFilter.MDC_USUARIO));
        assertFalse(visto.values().stream().anyMatch(valor -> valor.contains(CORREO)));
        assertFalse(visto.values().stream().anyMatch(valor -> valor.contains("secreto")));
        assertEquals("abc12345-def6", respuesta.getHeader("X-Correlation-Id"));
        assertTrue(MDC.getCopyOfContextMap() == null || MDC.getCopyOfContextMap().isEmpty());
    }

    @Test
    void unUsuarioNoAutenticadoSeRegistraComoAnonimo() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("clave", "anonymousUser",
                        AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));
        Map<String, String> visto = ejecutar(new MockHttpServletRequest("GET", "/productos"));

        assertEquals("anonimo", visto.get(ContextoLogFilter.MDC_USUARIO));
    }

    @Test
    void sinAutenticacionTambienEsAnonimo() throws Exception {
        Map<String, String> visto = ejecutar(new MockHttpServletRequest("GET", "/productos"));

        assertEquals("anonimo", visto.get(ContextoLogFilter.MDC_USUARIO));
    }

    @Test
    void saneaElUserAgentYLoTrunca() throws Exception {
        MockHttpServletRequest peticion = new MockHttpServletRequest("GET", "/productos");
        peticion.addHeader("User-Agent", "Agente\r\nevento_falso=1\t" + "x".repeat(500));

        Map<String, String> visto = ejecutar(peticion);

        String agente = visto.get(ContextoLogFilter.MDC_USER_AGENT);
        assertFalse(agente.contains("\r"));
        assertFalse(agente.contains("\n"));
        assertFalse(agente.contains("\t"));
        assertTrue(agente.startsWith("Agente__evento_falso=1_"));
        assertEquals(200, agente.length());
    }

    @Test
    void sinUserAgentUsaUnGuion() throws Exception {
        Map<String, String> visto = ejecutar(new MockHttpServletRequest("GET", "/productos"));

        assertEquals("-", visto.get(ContextoLogFilter.MDC_USER_AGENT));
    }

    @Test
    void aceptaUnCorrelationIdConFormatoValido() {
        assertEquals("a1b2c3d4", ContextoLogFilter.obtenerCorrelationId("a1b2c3d4"));
        assertEquals(UUID.fromString("123e4567-e89b-12d3-a456-426614174000").toString(),
                ContextoLogFilter.obtenerCorrelationId("123e4567-e89b-12d3-a456-426614174000"));
    }

    @Test
    void sustituyeUnCorrelationIdMaliciosoOMalFormado() {
        List<String> invalidos = List.of(
                "corto", "x".repeat(65), "con espacios 123", "abc\r\nevento_falso=1",
                "<script>alert(1)</script>", "abc12345;DROP", "");
        for (String invalido : invalidos) {
            String generado = ContextoLogFilter.obtenerCorrelationId(invalido);
            assertNotEquals(invalido, generado);
            UUID.fromString(generado);
        }
        UUID.fromString(ContextoLogFilter.obtenerCorrelationId(null));
    }

    @Test
    void generaUnCorrelationIdYLoDevuelveSiLaPeticionNoLoTrae() throws Exception {
        MockHttpServletResponse respuesta = new MockHttpServletResponse();
        Map<String, String> visto = new HashMap<>();

        filtro.doFilter(new MockHttpServletRequest("GET", "/productos"), respuesta, new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
                visto.putAll(MDC.getCopyOfContextMap());
            }
        });

        String generado = respuesta.getHeader("X-Correlation-Id");
        UUID.fromString(generado);
        assertEquals(generado, visto.get(ContextoLogFilter.MDC_CORRELATION_ID));
    }

    @Test
    void limpiaElMdcAunqueLaCadenaLanceUnaExcepcion() {
        MockHttpServletRequest peticion = new MockHttpServletRequest("GET", "/productos");

        try {
            filtro.doFilter(peticion, new MockHttpServletResponse(), (request, response) -> {
                throw new IllegalStateException("fallo simulado");
            });
        } catch (Exception esperado) {
            assertEquals("fallo simulado", esperado.getMessage());
        }

        assertTrue(MDC.getCopyOfContextMap() == null || MDC.getCopyOfContextMap().isEmpty());
    }

    private Map<String, String> ejecutar(MockHttpServletRequest peticion) throws Exception {
        Map<String, String> visto = new HashMap<>();
        filtro.doFilter(peticion, new MockHttpServletResponse(), new MockFilterChain() {
            @Override
            public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
                visto.putAll(MDC.getCopyOfContextMap());
            }
        });
        return visto;
    }
}
