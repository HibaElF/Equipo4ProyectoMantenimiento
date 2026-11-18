package es.uclm.esibuy.backend.controllers;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.exceptions.ClienteConPedidosEnCursoException;
import es.uclm.esibuy.backend.exceptions.VendedorConPedidosEnCursoException;
import es.uclm.esibuy.backend.services.ClienteService;
import es.uclm.esibuy.backend.services.PerfilService;
import es.uclm.esibuy.backend.services.ProductoService;
import es.uclm.esibuy.backend.services.VendedorService;

@WebMvcTest(controllers = { ClienteController.class, VendedorController.class })
@Import(SecurityConfiguration.class)
class CuentaBajaControllerSecurityTests {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private ClienteService clienteService;
    @MockitoBean private ProductoService productoService;
    @MockitoBean private PerfilService perfilService;
    @MockitoBean private VendedorService vendedorService;

    @Test
    void clienteSoloPuedeSolicitarLaBajaDeLaCuentaDeSuSesionConCsrf() throws Exception {
        mockMvc.perform(delete("/cliente/cuenta")
                        .param("email", "otra@example.com")
                        .with(user("ana@example.com").roles("CLIENTE"))
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(clienteService).darDeBaja("ana@example.com");
    }

    @Test
    void vendedorSoloPuedeSolicitarLaBajaDeLaCuentaDeSuSesionConCsrf() throws Exception {
        mockMvc.perform(delete("/vendedor/cuenta")
                        .param("email", "otro@example.com")
                        .with(user("tienda@example.com").roles("VENDEDOR"))
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(vendedorService).darDeBaja("tienda@example.com");
    }

    @Test
    void clienteConPedidosEnCursoRecibe409ConElMotivo() throws Exception {
        doThrow(new ClienteConPedidosEnCursoException()).when(clienteService).darDeBaja("ana@example.com");

        mockMvc.perform(delete("/cliente/cuenta")
                        .with(user("ana@example.com").roles("CLIENTE"))
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error")
                        .value("No puedes darte de baja porque tienes pedidos en curso (pagados o enviados)."));
    }

    @Test
    void vendedorConPedidosEnCursoRecibe409ConElMotivo() throws Exception {
        doThrow(new VendedorConPedidosEnCursoException()).when(vendedorService).darDeBaja("tienda@example.com");

        mockMvc.perform(delete("/vendedor/cuenta")
                        .with(user("tienda@example.com").roles("VENDEDOR"))
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error")
                        .value("No puedes darte de baja porque tienes pedidos en curso."));
    }

    @Test
    void administradoresReciben403EnLasDosRutasDeBaja() throws Exception {
        mockMvc.perform(delete("/cliente/cuenta").with(user("admin@example.com").roles("ADMIN")).with(csrf()))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/vendedor/cuenta").with(user("admin@example.com").roles("ADMIN")).with(csrf()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(clienteService, vendedorService);
    }

    @Test
    void rechazaLaBajaSinTokenCsrfAntesDeLlamarAlServicio() throws Exception {
        mockMvc.perform(delete("/cliente/cuenta").with(user("ana@example.com").roles("CLIENTE")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(clienteService);
    }

}
