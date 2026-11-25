package es.uclm.esibuy.backend.controllers;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dao.AlmacenAuditoria;
import es.uclm.esibuy.backend.model.EventoAuditoria;

@WebMvcTest(controllers = AuditoriaController.class)
@Import(SecurityConfiguration.class)
class AuditoriaControllerSecurityTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AlmacenAuditoria almacen;

    @Test
    void unAdministradorConsultaLosEventosPaginados() throws Exception {
        when(almacen.consultar(0, 20)).thenReturn(List.of(new EventoAuditoria(
                Instant.parse("2026-11-20T10:00:00Z"), "usuario_bloqueado", "exito",
                "0123456789abcdef", "usuario-7", "203.0.113.9", "abc12345-def6", Map.of())));
        when(almacen.contar()).thenReturn(1L);

        mockMvc.perform(get("/administrador/auditoria").with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.pagina").value(0))
                .andExpect(jsonPath("$.tamano").value(20))
                .andExpect(jsonPath("$.eventos[0].tipo").value("usuario_bloqueado"))
                .andExpect(jsonPath("$.eventos[0].actor").value("0123456789abcdef"))
                .andExpect(jsonPath("$.eventos[0].objetivo").value("usuario-7"))
                .andExpect(jsonPath("$.eventos[0].ip").value("203.0.113.9"))
                .andExpect(jsonPath("$.eventos[0].correlationId").value("abc12345-def6"));
    }

    @Test
    void clienteYVendedorNoPuedenConsultarLaAuditoria() throws Exception {
        mockMvc.perform(get("/administrador/auditoria").with(user("c@example.com").roles("CLIENTE")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/administrador/auditoria").with(user("v@example.com").roles("VENDEDOR")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(almacen);
    }

    @Test
    void sinAutenticarNoSePuedeConsultarLaAuditoria() throws Exception {
        mockMvc.perform(get("/administrador/auditoria"))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(almacen);
    }

    @Test
    void laAuditoriaEsDeSoloLectura() throws Exception {
        mockMvc.perform(put("/administrador/auditoria").with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().is4xxClientError());
        mockMvc.perform(delete("/administrador/auditoria").with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(almacen);
    }

    @Test
    void rechazaTamanosDePaginaFueraDeRango() throws Exception {
        mockMvc.perform(get("/administrador/auditoria").param("tamano", "101")
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/administrador/auditoria").param("tamano", "0")
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/administrador/auditoria").param("pagina", "-1")
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isBadRequest());

        org.mockito.Mockito.verify(almacen, org.mockito.Mockito.never()).consultar(anyInt(), anyInt());
    }

    @Test
    void aceptaElTamanoMaximo() throws Exception {
        when(almacen.consultar(0, 100)).thenReturn(List.of());

        mockMvc.perform(get("/administrador/auditoria").param("tamano", "100")
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk());

        verify(almacen).consultar(0, 100);
    }
}
