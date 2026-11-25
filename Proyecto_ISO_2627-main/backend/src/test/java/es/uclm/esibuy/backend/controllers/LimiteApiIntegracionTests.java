package es.uclm.esibuy.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.config.SecurityConfiguration;

// El filtro dentro de la cadena de seguridad real, con el límite por defecto de la aplicación (60/min)
// y con sus propiedades.
@WebMvcTest(controllers = LimiteApiIntegracionTests.ControladorDePrueba.class)
@Import({ SecurityConfiguration.class, LimiteApiIntegracionTests.ControladorDePrueba.class })
@TestPropertySource(properties = {
        "app.security.rate-limit.api.max-requests=60",
        "app.security.rate-limit.api.window-seconds=60" })
class LimiteApiIntegracionTests {

    @Autowired
    private MockMvc mockMvc;

    @RestController
    static class ControladorDePrueba {

        @GetMapping("/prueba/datos")
        String datos() {
            return "ok";
        }

        @GetMapping("/usuarios/sesion-actual")
        String sesion() {
            return "ok";
        }
    }

    @Test
    void elUsoNormalNoRecibe429YLaPeticion61SiConRetryAfterYCorrelationId() throws Exception {
        for (int i = 0; i < 60; i++) {
            mockMvc.perform(get("/prueba/datos").with(user("ana@example.com").roles("CLIENTE")))
                    .andExpect(status().isOk());
        }

        MvcResult rechazada = mockMvc.perform(get("/prueba/datos")
                        .with(user("ana@example.com").roles("CLIENTE")))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").exists())
                .andReturn();

        assertTrue(Integer.parseInt(rechazada.getResponse().getHeader("Retry-After")) >= 1);
        // El filtro de contexto de log va antes: la respuesta de límite también lleva el correlationId.
        assertTrue(rechazada.getResponse().getHeader("X-Correlation-Id") != null);

        // Otro usuario no se ve afectado, y las rutas excluidas siguen funcionando para el limitado.
        mockMvc.perform(get("/prueba/datos").with(user("luis@example.com").roles("CLIENTE")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/usuarios/sesion-actual").with(user("ana@example.com").roles("CLIENTE")))
                .andExpect(status().isOk());
    }
}
