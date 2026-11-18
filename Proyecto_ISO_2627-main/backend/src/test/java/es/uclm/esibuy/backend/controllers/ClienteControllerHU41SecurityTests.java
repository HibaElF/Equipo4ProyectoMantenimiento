package es.uclm.esibuy.backend.controllers;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dto.PerfilResponse;
import es.uclm.esibuy.backend.exceptions.PagoPremiumException;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.services.ClienteService;
import es.uclm.esibuy.backend.services.PerfilService;
import es.uclm.esibuy.backend.services.ProductoService;
import es.uclm.esibuy.backend.services.SesionService;

@WebMvcTest(controllers = ClienteController.class)
@Import(SecurityConfiguration.class)
class ClienteControllerHU41SecurityTests {

    private static final String EMAIL_CLIENTE = "cliente@example.com";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClienteService clienteService;

    @MockitoBean
    private ProductoService productoService;

    @MockitoBean
    private PerfilService perfilService;

    @MockitoBean
    private SesionService sesionService;

    @Test
    void clienteAutenticadoPuedeCambiarSuTipoConCsrf() throws Exception {
        when(clienteService.cambiarTipoCliente(EMAIL_CLIENTE, true, "mp-1")).thenReturn(new Cliente());
        when(perfilService.consultarPerfil(EMAIL_CLIENTE)).thenReturn(perfilPremium());

        mockMvc.perform(put("/cliente/tipo")
                        .with(user(EMAIL_CLIENTE).roles("CLIENTE"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"esPremium\":true,\"metodoPagoId\":\"mp-1\"}"))
                .andExpect(status().isOk());

        verify(clienteService).cambiarTipoCliente(EMAIL_CLIENTE, true, "mp-1");
        verify(perfilService).consultarPerfil(EMAIL_CLIENTE);
    }

    @Test
    void utilizaLaIdentidadAutenticadaAunqueSeEnvienDatosDeOtroCliente() throws Exception {
        when(clienteService.cambiarTipoCliente(EMAIL_CLIENTE, true, "mp-1")).thenReturn(new Cliente());
        when(perfilService.consultarPerfil(EMAIL_CLIENTE)).thenReturn(perfilPremium());

        mockMvc.perform(put("/cliente/tipo")
                        .param("clienteId", "cliente-de-otro")
                        .with(user(EMAIL_CLIENTE).roles("CLIENTE"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"esPremium\":true,\"metodoPagoId\":\"mp-1\",\"clienteId\":\"cliente-de-otro\",\"email\":\"otro@example.com\"}"))
                .andExpect(status().isOk());

        verify(clienteService).cambiarTipoCliente(eq(EMAIL_CLIENTE), eq(true), eq("mp-1"));
    }

    @Test
    void devuelve400SiElPagoPremiumNoEsValido() throws Exception {
        when(clienteService.cambiarTipoCliente(EMAIL_CLIENTE, true, null))
                .thenThrow(new PagoPremiumException("Selecciona un método de pago para hacerte premium."));

        mockMvc.perform(put("/cliente/tipo")
                        .with(user(EMAIL_CLIENTE).roles("CLIENTE"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"esPremium\":true}"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(perfilService);
    }

    @Test
    void vendedorYAdministradorNoPuedenUsarElEndpoint() throws Exception {
        mockMvc.perform(put("/cliente/tipo")
                        .with(user("vendedor@example.com").roles("VENDEDOR"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"esPremium\":true}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/cliente/tipo")
                        .with(user("admin@example.com").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"esPremium\":true}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(clienteService, perfilService);
    }

    @Test
    void rechazaLaPeticionSinAutenticacion() throws Exception {
        mockMvc.perform(put("/cliente/tipo")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"esPremium\":true}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(clienteService, perfilService);
    }

    @Test
    void rechazaLaPeticionDeClienteSinCsrf() throws Exception {
        mockMvc.perform(put("/cliente/tipo")
                        .with(user(EMAIL_CLIENTE).roles("CLIENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"esPremium\":true}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(clienteService, perfilService);
    }

    private PerfilResponse perfilPremium() {
        return new PerfilResponse(
                "CLIENTE", "Ana", "Apellidos", EMAIL_CLIENTE, null, null,
                null, null, true, null, null, null, null, null, null);
    }
}