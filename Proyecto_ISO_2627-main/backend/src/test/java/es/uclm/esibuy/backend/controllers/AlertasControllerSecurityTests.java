package es.uclm.esibuy.backend.controllers;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dto.AlertasResponse;
import es.uclm.esibuy.backend.services.AlertaService;

// Acceso solo del cliente a sus propias alertas y CSRF en las operaciones que las modifican.
@WebMvcTest(AlertasController.class)
@Import(SecurityConfiguration.class)
class AlertasControllerSecurityTests {

    private static final String RUTA = "/cliente/alertas";
    private static final String CORREO = "cliente@test.com";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AlertaService alertaService;

    static Stream<MockHttpServletRequestBuilder> mutaciones() {
        return Stream.of(
                patch(RUTA + "/a1/leida"),
                patch(RUTA + "/leidas"));
    }

    static Stream<MockHttpServletRequestBuilder> todas() {
        return Stream.concat(Stream.of(get(RUTA)), mutaciones());
    }

    @ParameterizedTest
    @MethodSource("mutaciones")
    void lasMutacionesSinCsrfSonRechazadas(MockHttpServletRequestBuilder peticion) throws Exception {
        mvc.perform(peticion.with(user(CORREO).roles("CLIENTE")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(alertaService);
    }

    @ParameterizedTest
    @MethodSource("todas")
    void sinSesionNoSeAccedeANingunEndpoint(MockHttpServletRequestBuilder peticion) throws Exception {
        mvc.perform(peticion.with(csrf()))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(alertaService);
    }

    @ParameterizedTest
    @MethodSource("todas")
    void vendedoresYAdministradoresNoTienenAlertas(MockHttpServletRequestBuilder peticion) throws Exception {
        mvc.perform(peticion.with(user("vendedor@test.com").roles("VENDEDOR")).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(peticion.with(user("admin@test.com").roles("ADMIN")).with(csrf()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(alertaService);
    }

    @Test
    void consultarNoAceptaPropietarioManipulado() throws Exception {
        when(alertaService.consultar(CORREO)).thenReturn(new AlertasResponse(List.of(), 0));

        mvc.perform(get(RUTA)
                        .param("clienteId", "otro-cliente")
                        .header("X-Usuario-Id", "otro-cliente")
                        .with(user(CORREO).roles("CLIENTE")))
                .andExpect(status().isOk());

        verify(alertaService).consultar(CORREO);
        verifyNoMoreInteractions(alertaService);
    }
}
