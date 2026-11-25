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
import es.uclm.esibuy.backend.dto.EstadisticasVendedoresResponse;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.dto.ProductoValoracionResponse;
import es.uclm.esibuy.backend.dto.ProductoVentasResponse;
import es.uclm.esibuy.backend.dto.VendedorValoracionResponse;
import es.uclm.esibuy.backend.services.EstadisticasAdministradorService;

// Estadísticas globales: solo las consulta un administrador (cualquiera de ellos).
@WebMvcTest(EstadisticasAdministradorController.class)
@Import(SecurityConfiguration.class)
class EstadisticasAdministradorSecurityTests {

    private static final String RUTA_VENTAS = "/administrador/estadisticas/ventas";
    private static final String RUTA_VALORACIONES = "/administrador/estadisticas/valoraciones";
    private static final String RUTA_VENDEDORES = "/administrador/estadisticas/vendedores";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private EstadisticasAdministradorService estadisticasAdministradorService;

    @Test
    void elAdministradorConsultaLasVentasDeTodasLasTiendas() throws Exception {
        ProductoVentasResponse mochila = new ProductoVentasResponse("p2", "Mochila", "Tienda B", 6);
        when(estadisticasAdministradorService.consultarVentas())
                .thenReturn(new EstadisticasVentasResponse(List.of(mochila), List.of(mochila), null));

        mvc.perform(get(RUTA_VENTAS).with(user("admin@test.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.masVendidos[0].nombre").value("Mochila"))
                .andExpect(jsonPath("$.masVendidos[0].vendedor").value("Tienda B"))
                .andExpect(jsonPath("$.masVendidos[0].unidadesVendidas").value(6));

        verify(estadisticasAdministradorService).consultarVentas();
    }

    @Test
    void elAdministradorConsultaLasValoracionesDeTodasLasTiendas() throws Exception {
        ProductoValoracionResponse mochila = new ProductoValoracionResponse("p2", "Mochila", "Tienda B", 4.75, 4);
        when(estadisticasAdministradorService.consultarValoraciones())
                .thenReturn(new EstadisticasValoracionesResponse(List.of(mochila), List.of(mochila), null));

        mvc.perform(get(RUTA_VALORACIONES).with(user("admin@test.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mejorValorados[0].vendedor").value("Tienda B"))
                .andExpect(jsonPath("$.mejorValorados[0].valoracionMedia").value(4.75))
                .andExpect(jsonPath("$.peorValorados[0].numeroValoraciones").value(4));

        verify(estadisticasAdministradorService).consultarValoraciones();
    }

    @Test
    void elAdministradorConsultaElRankingDeVendedores() throws Exception {
        VendedorValoracionResponse tiendaB = new VendedorValoracionResponse("Tienda B", 4.0, 2, 1);
        when(estadisticasAdministradorService.consultarVendedores())
                .thenReturn(new EstadisticasVendedoresResponse(List.of(tiendaB), List.of("Tienda Nueva"), null));

        mvc.perform(get(RUTA_VENDEDORES).with(user("admin@test.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ranking[0].vendedor").value("Tienda B"))
                .andExpect(jsonPath("$.ranking[0].valoracionMedia").value(4.0))
                .andExpect(jsonPath("$.ranking[0].numeroValoraciones").value(2))
                .andExpect(jsonPath("$.vendedoresSinValoraciones[0]").value("Tienda Nueva"));

        verify(estadisticasAdministradorService).consultarVendedores();
    }

    @ParameterizedTest
    @ValueSource(strings = {RUTA_VENTAS, RUTA_VALORACIONES, RUTA_VENDEDORES})
    void unVendedorRecibe403(String ruta) throws Exception {
        mvc.perform(get(ruta).with(user("vendedor@test.com").roles("VENDEDOR")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasAdministradorService);
    }

    @ParameterizedTest
    @ValueSource(strings = {RUTA_VENTAS, RUTA_VALORACIONES, RUTA_VENDEDORES})
    void unClienteRecibe403(String ruta) throws Exception {
        mvc.perform(get(ruta).with(user("cliente@test.com").roles("CLIENTE")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasAdministradorService);
    }

    @ParameterizedTest
    @ValueSource(strings = {RUTA_VENTAS, RUTA_VALORACIONES, RUTA_VENDEDORES})
    void sinSesionSeRechaza(String ruta) throws Exception {
        mvc.perform(get(ruta))
                .andExpect(status().isForbidden());

        verifyNoInteractions(estadisticasAdministradorService);
    }
}
