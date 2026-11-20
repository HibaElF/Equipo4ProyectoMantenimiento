package es.uclm.esibuy.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;
import es.uclm.esibuy.backend.exceptions.DuplicateRegistrationException;
import es.uclm.esibuy.backend.exceptions.ProductoAjenoException;
import es.uclm.esibuy.backend.exceptions.ProductoNoEncontradoException;

// Comprueba qué recibe el cliente ante cada tipo de error: nunca trazas, nombres de clase ni
// detalles internos, y los errores de validación propios siguen mostrando su mensaje.
@WebMvcTest(controllers = ManejoGenericoDeErroresTests.ControladorDePrueba.class)
@Import({ SecurityConfiguration.class, ManejadorErroresInesperados.class,
        ManejoGenericoDeErroresTests.ControladorDePrueba.class })
class ManejoGenericoDeErroresTests {

    private static final String DETALLE_INTERNO = "tabla usuarios de mongodb 7.0.1 en /srv/esibuy";

    @Autowired
    private MockMvc mockMvc;

    @RestController
    static class ControladorDePrueba {

        @GetMapping("/prueba/datos-no-validos")
        String datosNoValidos() {
            throw new DatosNoValidosException("El precio debe ser positivo.");
        }

        @GetMapping("/prueba/argumento-ilegal")
        String argumentoIlegal() {
            throw new IllegalArgumentException(DETALLE_INTERNO);
        }

        @GetMapping("/prueba/inesperada")
        String inesperada() {
            throw new IllegalStateException(DETALLE_INTERNO);
        }

        @GetMapping("/prueba/envuelta")
        String envuelta() {
            throw new RuntimeException("fallo externo", new java.sql.SQLException(DETALLE_INTERNO));
        }

        @GetMapping("/prueba/denegado")
        String denegado() {
            throw new AccessDeniedException(DETALLE_INTERNO);
        }

        @GetMapping("/prueba/no-encontrado")
        String noEncontrado() {
            throw new ProductoNoEncontradoException();
        }

        @GetMapping("/prueba/conflicto")
        String conflicto() {
            throw new DuplicateRegistrationException();
        }

        @GetMapping("/prueba/ajeno")
        String ajeno() {
            throw new ProductoAjenoException();
        }

        @PostMapping("/prueba/cuerpo")
        String cuerpo(@RequestBody java.util.Map<String, String> cuerpo) {
            return "ok";
        }
    }

    @Test
    void unaExcepcionInesperadaDevuelve500GenericoConCorrelationIdYSinDetalles() throws Exception {
        MvcResult resultado = mockMvc.perform(get("/prueba/inesperada")
                        .with(user("cliente@example.com").roles("CLIENTE"))
                        .header("X-Correlation-Id", "abc12345-def6"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value(ManejadorErroresInesperados.MENSAJE_ERROR_INTERNO))
                .andExpect(jsonPath("$.correlationId").value("abc12345-def6"))
                .andReturn();

        String cuerpo = resultado.getResponse().getContentAsString();
        assertEquals("abc12345-def6", resultado.getResponse().getHeader("X-Correlation-Id"));
        assertSinDetallesInternos(cuerpo);
    }

    @Test
    void unaExcepcionEnvueltaTambienDevuelve500Generico() throws Exception {
        MvcResult resultado = mockMvc.perform(get("/prueba/envuelta")
                        .with(user("cliente@example.com").roles("CLIENTE")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value(ManejadorErroresInesperados.MENSAJE_ERROR_INTERNO))
                .andReturn();

        assertSinDetallesInternos(resultado.getResponse().getContentAsString());
        String correlationId = resultado.getResponse().getHeader("X-Correlation-Id");
        assertTrue(resultado.getResponse().getContentAsString().contains(correlationId));
    }

    @Test
    void unaIllegalArgumentExceptionGenericaDevuelve400ConMensajeFijo() throws Exception {
        MvcResult resultado = mockMvc.perform(get("/prueba/argumento-ilegal")
                        .with(user("cliente@example.com").roles("CLIENTE")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("La solicitud no es válida."))
                .andReturn();

        assertSinDetallesInternos(resultado.getResponse().getContentAsString());
    }

    @Test
    void losDatosNoValidosPropiosSiguenMostrandoSuMensaje() throws Exception {
        mockMvc.perform(get("/prueba/datos-no-validos")
                        .with(user("cliente@example.com").roles("CLIENTE")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("El precio debe ser positivo."));
    }

    @Test
    void laDenegacionDeAccesoSigueSiendo403YNoUn500() throws Exception {
        MvcResult resultado = mockMvc.perform(get("/prueba/denegado")
                        .with(user("cliente@example.com").roles("CLIENTE")))
                .andExpect(status().isForbidden())
                .andReturn();

        assertSinDetallesInternos(resultado.getResponse().getContentAsString());
    }

    @Test
    void losErroresDeDominioConservanSuCodigo404_409Y403() throws Exception {
        mockMvc.perform(get("/prueba/no-encontrado").with(user("c@example.com").roles("CLIENTE")))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/prueba/conflicto").with(user("c@example.com").roles("CLIENTE")))
                .andExpect(status().isConflict());
        mockMvc.perform(get("/prueba/ajeno").with(user("c@example.com").roles("CLIENTE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void lasRespuestasPropiasDeSpringMvcNoSeConviertenEn500() throws Exception {
        // 404: ruta inexistente.
        mockMvc.perform(get("/prueba/no-existe").with(user("c@example.com").roles("CLIENTE")))
                .andExpect(status().isNotFound());
        // 405: método no permitido.
        mockMvc.perform(post("/prueba/inesperada").with(csrf()).with(user("c@example.com").roles("CLIENTE")))
                .andExpect(status().isMethodNotAllowed());
        // 400: cuerpo JSON ilegible.
        mockMvc.perform(post("/prueba/cuerpo").with(csrf()).with(user("c@example.com").roles("CLIENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{esto no es json"))
                .andExpect(status().isBadRequest());
    }

    private static void assertSinDetallesInternos(String cuerpo) {
        assertFalse(cuerpo.contains("mongodb"), cuerpo);
        assertFalse(cuerpo.contains("7.0.1"), cuerpo);
        assertFalse(cuerpo.contains("/srv"), cuerpo);
        assertFalse(cuerpo.contains("Exception"), cuerpo);
        assertFalse(cuerpo.contains("java."), cuerpo);
        assertFalse(cuerpo.contains("es.uclm"), cuerpo);
        assertFalse(cuerpo.contains("\tat "), cuerpo);
        assertFalse(cuerpo.contains("stackTrace"), cuerpo);
    }
}
