package es.uclm.esibuy.backend.controllers;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dto.AlertaResponse;
import es.uclm.esibuy.backend.dto.AlertasResponse;
import es.uclm.esibuy.backend.exceptions.AlertaNoEncontradaException;
import es.uclm.esibuy.backend.model.TipoAlerta;
import es.uclm.esibuy.backend.services.AlertaService;

@WebMvcTest(AlertasController.class)
@Import(SecurityConfiguration.class)
class AlertasControllerTests {

    private static final String RUTA = "/cliente/alertas";
    private static final String CORREO = "cliente@test.com";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AlertaService alertaService;

    private AlertasResponse respuestaConUnaAlerta(boolean leida) {
        AlertaResponse alerta = new AlertaResponse("a1", TipoAlerta.DISPONIBILIDAD, "producto-1",
                "«Teclado», de tus favoritos, vuelve a estar disponible.", Instant.parse("2026-11-24T10:00:00Z"), leida);
        return new AlertasResponse(List.of(alerta), leida ? 0 : 1);
    }

    @Test
    void consultarDevuelveLasAlertasDelAutenticado() throws Exception {
        when(alertaService.consultar(CORREO)).thenReturn(respuestaConUnaAlerta(false));

        mvc.perform(get(RUTA).with(user(CORREO).roles("CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noLeidas").value(1))
                .andExpect(jsonPath("$.alertas[0].id").value("a1"))
                .andExpect(jsonPath("$.alertas[0].tipo").value("DISPONIBILIDAD"))
                .andExpect(jsonPath("$.alertas[0].leida").value(false));
    }

    @Test
    void marcarLeidaConCsrfDevuelveLasAlertasActualizadas() throws Exception {
        when(alertaService.marcarLeida(CORREO, "a1")).thenReturn(respuestaConUnaAlerta(true));

        mvc.perform(patch(RUTA + "/a1/leida").with(user(CORREO).roles("CLIENTE")).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noLeidas").value(0))
                .andExpect(jsonPath("$.alertas[0].leida").value(true));
    }

    @Test
    void marcarTodasLeidasConCsrf() throws Exception {
        when(alertaService.marcarTodasLeidas(CORREO)).thenReturn(respuestaConUnaAlerta(true));

        mvc.perform(patch(RUTA + "/leidas").with(user(CORREO).roles("CLIENTE")).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noLeidas").value(0));

        verify(alertaService).marcarTodasLeidas(CORREO);
    }

    @Test
    void borrarConCsrfDevuelveLasAlertasQueQuedan() throws Exception {
        when(alertaService.borrar(CORREO, "a1")).thenReturn(new AlertasResponse(List.of(), 0));

        mvc.perform(delete(RUTA + "/a1").with(user(CORREO).roles("CLIENTE")).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alertas").isEmpty());
    }

    @Test
    void borrarTodasConCsrf() throws Exception {
        when(alertaService.borrarTodas(CORREO)).thenReturn(new AlertasResponse(List.of(), 0));

        mvc.perform(delete(RUTA).with(user(CORREO).roles("CLIENTE")).with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noLeidas").value(0));

        verify(alertaService).borrarTodas(CORREO);
    }

    @Test
    void borrarUnaAlertaAjenaDevuelve404() throws Exception {
        when(alertaService.borrar(CORREO, "alerta-de-otro")).thenThrow(new AlertaNoEncontradaException());

        mvc.perform(delete(RUTA + "/alerta-de-otro").with(user(CORREO).roles("CLIENTE")).with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void marcarLeidaUnaAlertaInexistenteDevuelve404() throws Exception {
        when(alertaService.marcarLeida(CORREO, "otra")).thenThrow(new AlertaNoEncontradaException());

        mvc.perform(patch(RUTA + "/otra/leida").with(user(CORREO).roles("CLIENTE")).with(csrf()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("No se ha encontrado la alerta solicitada."));
    }
}
