package es.uclm.esibuy.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

class LimiteApiFilterTests {

    private final LimiteApiFilter filtro = new LimiteApiFilter(
            new LimiteApiService(3, Duration.ofMinutes(1), Clock.systemUTC()));

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletResponse peticion(String metodo, String ruta, String ip) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, ruta);
        request.setRemoteAddr(ip);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain cadena = new MockFilterChain();
        filtro.doFilter(request, response, cadena);
        return response;
    }

    private void autenticar(String usuario) {
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                usuario, null, AuthorityUtils.createAuthorityList("ROLE_CLIENTE")));
    }

    @Test
    void lasPeticionesDentroDelLimitePasanYLaSiguienteRecibe429ConRetryAfter() throws Exception {
        for (int i = 0; i < 3; i++) {
            assertEquals(200, peticion("GET", "/productos", "203.0.113.9").getStatus());
        }

        MockHttpServletResponse rechazada = peticion("GET", "/productos", "203.0.113.9");

        assertEquals(429, rechazada.getStatus());
        int retryAfter = Integer.parseInt(rechazada.getHeader("Retry-After"));
        assertTrue(retryAfter >= 1 && retryAfter <= 60);
        assertEquals("application/json", rechazada.getContentType().split(";")[0]);
        assertTrue(rechazada.getContentAsString().contains("\"error\":\"Demasiadas peticiones."));
    }

    @Test
    void laRespuestaDeLimiteNoContieneDatosInternosNiLaClave() throws Exception {
        autenticar("ana@example.com");
        for (int i = 0; i < 3; i++) {
            peticion("GET", "/productos", "203.0.113.9");
        }

        String cuerpo = peticion("GET", "/productos", "203.0.113.9").getContentAsString();

        assertFalse(cuerpo.contains("ana@example.com"));
        assertFalse(cuerpo.contains("203.0.113.9"));
        assertFalse(cuerpo.contains("Exception"));
    }

    @Test
    void unUsuarioAutenticadoSeLimitaPorUsuarioAunqueCambieDeIp() throws Exception {
        autenticar("ana@example.com");
        for (int i = 0; i < 3; i++) {
            assertEquals(200, peticion("GET", "/productos", "203.0.113." + i).getStatus());
        }

        assertEquals(429, peticion("GET", "/productos", "198.51.100.77").getStatus());

        autenticar("luis@example.com");
        assertEquals(200, peticion("GET", "/productos", "198.51.100.77").getStatus());
    }

    @Test
    void unAnonimoSeLimitaPorIp() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "clave", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));
        for (int i = 0; i < 3; i++) {
            peticion("GET", "/productos", "203.0.113.9");
        }

        assertEquals(429, peticion("GET", "/productos", "203.0.113.9").getStatus());
        assertEquals(200, peticion("GET", "/productos", "203.0.113.10").getStatus());
    }

    @Test
    void lasRutasExcluidasNoConsumenCupoNiSeLimitan() throws Exception {
        for (int i = 0; i < 20; i++) {
            assertEquals(200, peticion("GET", "/usuarios/sesion-actual", "203.0.113.9").getStatus());
            assertEquals(200, peticion("GET", "/usuarios/csrf", "203.0.113.9").getStatus());
            assertEquals(200, peticion("GET", "/product-images/foto-" + i + ".png", "203.0.113.9").getStatus());
            assertEquals(200, peticion("OPTIONS", "/productos", "203.0.113.9").getStatus());
            // C-04: las exclusiones comparan la ruta decodificada.
            assertEquals(200, peticion("GET", "/usuarios/%63srf", "203.0.113.9").getStatus());
            assertEquals(200, peticion("GET", "/%70roduct-images/foto.png", "203.0.113.9").getStatus());
            assertEquals(200, peticion("GET", "/product%2Dimages/foto.png", "203.0.113.9").getStatus());
        }

        // El cupo sigue intacto para el resto de la API.
        for (int i = 0; i < 3; i++) {
            assertEquals(200, peticion("GET", "/productos", "203.0.113.9").getStatus());
        }
        assertEquals(429, peticion("GET", "/productos", "203.0.113.9").getStatus());
    }

    @Test
    void siSeLimitaLaPeticionNoLlegaALaCadena() throws Exception {
        for (int i = 0; i < 3; i++) {
            peticion("GET", "/productos", "203.0.113.9");
        }
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/productos");
        request.setRemoteAddr("203.0.113.9");
        MockFilterChain cadena = new MockFilterChain();

        filtro.doFilter(request, new MockHttpServletResponse(), cadena);

        assertNull(cadena.getRequest());
    }
}
