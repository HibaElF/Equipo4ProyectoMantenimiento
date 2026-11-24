package es.uclm.esibuy.backend.controllers;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dto.ExportacionDatosResponse;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.services.ExportacionDatosService;

@WebMvcTest(controllers = ExportacionDatosController.class)
@Import(SecurityConfiguration.class)
class ExportacionDatosControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExportacionDatosService servicio;

    private static ExportacionDatosResponse respuesta() {
        return new ExportacionDatosResponse(Instant.parse("2026-11-24T10:00:00Z"), "cliente",
                new ExportacionDatosResponse.Perfil("Ada", "Lovelace", "ada@example.com", null, null, "12345678Z",
                        null, false, null, null, null, null),
                null, null, null, null, null, null, null, null, null);
    }

    @Test
    void sinSesionNoSeEntregaNingunDato() throws Exception {
        mockMvc.perform(get("/usuarios/mis-datos")).andExpect(status().is4xxClientError());

        verifyNoInteractions(servicio);
    }

    @Test
    void elUsuarioAutenticadoDescargaSusDatosComoAdjuntoSinCache() throws Exception {
        when(servicio.exportar("ada@example.com")).thenReturn(respuesta());

        mockMvc.perform(get("/usuarios/mis-datos").with(user("ada@example.com").roles("CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"mis-datos.json\""))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.tipoUsuario").value("cliente"))
                .andExpect(jsonPath("$.perfil.dniNif").value("12345678Z"))
                // Las secciones que no corresponden no se serializan.
                .andExpect(jsonPath("$.productos").doesNotExist());

        // El propietario sale de la sesión: no hay parámetro con el que pedir los datos de otro.
        verify(servicio).exportar("ada@example.com");
    }

    @Test
    void cualquierRolAutenticadoPuedeExportarSusDatos() throws Exception {
        when(servicio.exportar("luis@example.com")).thenReturn(respuesta());
        when(servicio.exportar("root@example.com")).thenReturn(respuesta());

        mockMvc.perform(get("/usuarios/mis-datos").with(user("luis@example.com").roles("VENDEDOR")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/usuarios/mis-datos").with(user("root@example.com").roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test
    void ignoraCualquierIdentificadorDeOtroUsuarioEnLaPeticion() throws Exception {
        when(servicio.exportar("ada@example.com")).thenReturn(respuesta());

        mockMvc.perform(get("/usuarios/mis-datos").param("email", "otro@example.com").param("id", "c2")
                        .with(user("ada@example.com").roles("CLIENTE")))
                .andExpect(status().isOk());

        verify(servicio).exportar("ada@example.com");
    }

    @Test
    void sinCupoDevuelve429ConRetryAfter() throws Exception {
        when(servicio.exportar("ada@example.com")).thenThrow(new LoginRateLimitException(30));

        mockMvc.perform(get("/usuarios/mis-datos").with(user("ada@example.com").roles("CLIENTE")))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "30"));
    }
}
