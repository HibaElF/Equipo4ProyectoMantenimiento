package es.uclm.esibuy.backend.controllers;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.services.EstadisticasVendedorService;

// Estadísticas del vendedor: solo las consulta un vendedor, y siempre las suyas.
@WebMvcTest(EstadisticasVendedorController.class)
@Import(SecurityConfiguration.class)
class EstadisticasVendedorSecurityTests {

    private static final String RUTA_VENTAS = "/vendedor/estadisticas/ventas";
    private static final String CORREO = "vendedor@test.com";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private EstadisticasVendedorService estadisticasVendedorService;

    @Test
    void elVendedorConsultaLasVentasDeSusProductos() throws Exception {
        ProductoVentasResponse auriculares = new ProductoVentasResponse("p1", "Auriculares", "Mi Tienda", 15);
        when(estadisticasVendedorService.consultarVentas(CORREO))
                .thenReturn(new EstadisticasVentasResponse(List.of(auriculares), List.of(auriculares), null));

        mvc.perform(get(RUTA_VENTAS).with(user(CORREO).roles("VENDEDOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.masVendidos[0].nombre").value("Auriculares"))
                .andExpect(jsonPath("$.masVendidos[0].unidadesVendidas").value(15))
                .andExpect(jsonPath("$.menosVendidos[0].productoId").value("p1"));

        verify(estadisticasVendedorService).consultarVentas(CORREO);
    }

    @Test
    void unClienteRecibe403() throws Exception {
        mvc.perform(get(RUTA_VENTAS).with(user("cliente@test.com").roles("CLIENTE")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasVendedorService);
    }

    @Test
    void unAdministradorRecibe403() throws Exception {
        mvc.perform(get(RUTA_VENTAS).with(user("admin@test.com").roles("ADMIN")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasVendedorService);
    }

    @Test
    void sinSesionSeRechaza() throws Exception {
        mvc.perform(get(RUTA_VENTAS))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasVendedorService);
    }
}
