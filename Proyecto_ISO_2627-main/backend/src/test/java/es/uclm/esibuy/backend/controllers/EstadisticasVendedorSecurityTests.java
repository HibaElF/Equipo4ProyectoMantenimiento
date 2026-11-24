package es.uclm.esibuy.backend.controllers;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dto.EstadisticasValoracionesResponse;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoValoracionResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.services.EstadisticasVendedorService;

// Estadísticas del vendedor: solo las consulta un vendedor, y siempre las suyas (las del correo de la sesión).
@WebMvcTest(EstadisticasVendedorController.class)
@Import(SecurityConfiguration.class)
class EstadisticasVendedorSecurityTests {

    private static final String RUTA_VENTAS = "/vendedor/estadisticas/ventas";
    private static final String RUTA_VALORACIONES = "/vendedor/estadisticas/valoraciones";
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
    void elVendedorConsultaLasValoracionesDeSusProductos() throws Exception {
        ProductoValoracionResponse auriculares =
                new ProductoValoracionResponse("p1", "Auriculares", "Mi Tienda", 4.67, 3);
        when(estadisticasVendedorService.consultarValoraciones(CORREO))
                .thenReturn(new EstadisticasValoracionesResponse(List.of(auriculares), List.of(auriculares), null));

        mvc.perform(get(RUTA_VALORACIONES).with(user(CORREO).roles("VENDEDOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mejorValorados[0].valoracionMedia").value(4.67))
                .andExpect(jsonPath("$.mejorValorados[0].numeroValoraciones").value(3))
                .andExpect(jsonPath("$.peorValorados[0].nombre").value("Auriculares"));

        verify(estadisticasVendedorService).consultarValoraciones(CORREO);
    }

    @ParameterizedTest
    @ValueSource(strings = {RUTA_VENTAS, RUTA_VALORACIONES})
    void unClienteRecibe403(String ruta) throws Exception {
        mvc.perform(get(ruta).with(user("cliente@test.com").roles("CLIENTE")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasVendedorService);
    }

    @ParameterizedTest
    @ValueSource(strings = {RUTA_VENTAS, RUTA_VALORACIONES})
    void unAdministradorRecibe403(String ruta) throws Exception {
        mvc.perform(get(ruta).with(user("admin@test.com").roles("ADMIN")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasVendedorService);
    }

    @ParameterizedTest
    @ValueSource(strings = {RUTA_VENTAS, RUTA_VALORACIONES})
    void sinSesionSeRechaza(String ruta) throws Exception {
        mvc.perform(get(ruta))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasVendedorService);
    }
}
