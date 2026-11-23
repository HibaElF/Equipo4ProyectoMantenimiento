package es.uclm.esibuy.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.config.SecurityConfiguration;

// T-21: la política de contenido y el resto de cabeceras llegan tanto al HTML de Angular como a la API.
@WebMvcTest(controllers = { SpaController.class, CabecerasSeguridadTests.ControladorDePrueba.class })
@Import({ SecurityConfiguration.class, CabecerasSeguridadTests.ControladorDePrueba.class })
class CabecerasSeguridadTests {

    @Autowired
    private MockMvc mockMvc;

    @RestController
    static class ControladorDePrueba {

        @GetMapping("/prueba/datos")
        String datos() {
            return "ok";
        }
    }

    private MockHttpServletResponse obtener(String ruta) throws Exception {
        return mockMvc.perform(get(ruta).with(user("ana@example.com").roles("CLIENTE")))
                .andExpect(status().isOk())
                .andReturn().getResponse();
    }

    private static List<String> directivas(String politica) {
        return List.of(politica.split("\\s*;\\s*"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "/login", "/registro", "/verificar-correo", "/prueba/datos" })
    void laCabeceraContentSecurityPolicyEstaEnElHtmlYEnLaApi(String ruta) throws Exception {
        MockHttpServletResponse respuesta = obtener(ruta);

        String politica = respuesta.getHeader("Content-Security-Policy");
        assertTrue(politica != null && !politica.isBlank(), ruta);
        assertNull(respuesta.getHeader("Content-Security-Policy-Report-Only"));

        List<String> directivas = directivas(politica);
        assertTrue(directivas.contains("default-src 'self'"));
        assertTrue(directivas.contains("script-src 'self'"));
        assertTrue(directivas.contains("object-src 'none'"));
        assertTrue(directivas.contains("base-uri 'self'"));
        assertTrue(directivas.contains("form-action 'self'"));
        assertTrue(directivas.contains("frame-ancestors 'none'"));
        assertTrue(directivas.contains("connect-src 'self'"));
    }

    @Test
    void losScriptsNoAdmitenEjecucionEnLineaNiOrigenesExternos() throws Exception {
        String politica = obtener("/login").getHeader("Content-Security-Policy");

        String scripts = directivas(politica).stream()
                .filter(d -> d.startsWith("script-src"))
                .findFirst().orElseThrow();
        assertEquals("script-src 'self'", scripts);
        assertFalse(scripts.contains("unsafe-inline"));
        assertFalse(scripts.contains("unsafe-eval"));
        assertFalse(scripts.contains("*"));
    }

    @Test
    void permiteElQrDelTotpLasImagenesDePerfilHttpsYLaTipografia() throws Exception {
        List<String> directivas = directivas(obtener("/login").getHeader("Content-Security-Policy"));

        assertTrue(directivas.contains("img-src 'self' data: https:"));
        assertTrue(directivas.contains("font-src 'self' https://fonts.gstatic.com"));
        assertTrue(directivas.contains("style-src 'self' 'unsafe-inline'"));
    }

    @Test
    void anadeReferrerPolicyYPermissionsPolicy() throws Exception {
        MockHttpServletResponse respuesta = obtener("/login");

        assertEquals("strict-origin-when-cross-origin", respuesta.getHeader("Referrer-Policy"));
        String permisos = respuesta.getHeader("Permissions-Policy");
        assertTrue(permisos.contains("camera=()"));
        assertTrue(permisos.contains("microphone=()"));
        assertTrue(permisos.contains("geolocation=()"));
    }

    @Test
    void conservaLasCabecerasPorDefectoDeSpringSecurity() throws Exception {
        MockHttpServletResponse respuesta = obtener("/prueba/datos");

        assertEquals("nosniff", respuesta.getHeader("X-Content-Type-Options"));
        assertEquals("DENY", respuesta.getHeader("X-Frame-Options"));
    }
}
