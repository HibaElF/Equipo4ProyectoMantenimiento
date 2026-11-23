package es.uclm.esibuy.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;

// Con app.security.csp.report-only=true la política solo informa en la consola, sin bloquear.
@WebMvcTest(controllers = SpaController.class)
@Import(SecurityConfiguration.class)
@TestPropertySource(properties = "app.security.csp.report-only=true")
class CabecerasSeguridadSoloInformeTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void enModoSoloInformeSeEmiteLaCabeceraReportOnlyYNoLaObligatoria() throws Exception {
        MockHttpServletResponse respuesta = mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andReturn().getResponse();

        assertNull(respuesta.getHeader("Content-Security-Policy"));
        String politica = respuesta.getHeader("Content-Security-Policy-Report-Only");
        assertNotNull(politica);
        assertTrue(politica.contains("script-src 'self'"));
    }
}
