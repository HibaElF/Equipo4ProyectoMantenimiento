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

// C-07: las pantallas de estadísticas se pueden recargar; sus datos no se sirven sin sesión.
@WebMvcTest(controllers = SpaController.class)
@Import(SecurityConfiguration.class)
class PaginasEstadisticasPublicasTests {

    @Autowired
    private MockMvc mockMvc;

    @ParameterizedTest
    @ValueSource(strings = { "/admin/estadisticas", "/vendedor/estadisticas" })
    void recargarLasPantallasDeEstadisticasSirveAngular(String ruta) throws Exception {
        mockMvc.perform(get(ruta))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "/administrador/estadisticas/ventas", "/vendedor/estadisticas/ventas",
            "/vendedor/estadisticas/productos" })
    void losDatosDeEstadisticasNoSeSirvenSinSesion(String ruta) throws Exception {
        mockMvc.perform(get(ruta)).andExpect(status().isForbidden());
    }
}
