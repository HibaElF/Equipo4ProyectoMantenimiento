package es.uclm.esibuy.backend.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;

// T-24: la política de privacidad y el aviso legal son accesibles sin iniciar sesión.
@WebMvcTest(controllers = SpaController.class)
@Import(SecurityConfiguration.class)
class PaginasLegalesPublicasTests {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = { "/politica-privacidad", "/aviso-legal" })
    void lasPaginasLegalesSeSirvenSinSesion(String ruta) throws Exception {
        mockMvc.perform(get(ruta))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }
}
