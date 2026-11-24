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
import es.uclm.esibuy.backend.dto.CategoriaFavoritaResponse;
import es.uclm.esibuy.backend.exceptions.CategoriaNoEncontradaException;
import es.uclm.esibuy.backend.services.CategoriaFavoritaService;

@WebMvcTest(CategoriasFavoritasController.class)
@Import(SecurityConfiguration.class)
class CategoriasFavoritasControllerTests {

    private static final String RUTA = "/cliente/categorias-favoritas";
    private static final String CORREO = "cliente@test.com";
    private static final String CATEGORIA_ID = "cat-1";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CategoriaFavoritaService categoriaFavoritaService;

    private List<CategoriaFavoritaResponse> unaFavorita() {
        return List.of(new CategoriaFavoritaResponse(CATEGORIA_ID, "Electrónica"));
    }

    @Test
    void consultarDevuelveLasFavoritasDelClienteAutenticado() throws Exception {
        when(categoriaFavoritaService.consultar(CORREO)).thenReturn(unaFavorita());

        mvc.perform(get(RUTA)
                        .param("clienteId", "otro-cliente")
                        .with(user(CORREO).roles("CLIENTE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(CATEGORIA_ID))
                .andExpect(jsonPath("$[0].nombre").value("Electrónica"));

        verify(categoriaFavoritaService).consultar(CORREO);
    }

    @Test
    void anadirMarcaLaCategoriaComoFavorita() throws Exception {
        when(categoriaFavoritaService.anadir(CORREO, CATEGORIA_ID)).thenReturn(unaFavorita());

        mvc.perform(put(RUTA + "/" + CATEGORIA_ID)
                        .with(user(CORREO).roles("CLIENTE"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(CATEGORIA_ID));

        verify(categoriaFavoritaService).anadir(CORREO, CATEGORIA_ID);
    }

    @Test
    void anadirCategoriaInexistenteDevuelve404() throws Exception {
        when(categoriaFavoritaService.anadir(CORREO, "no-existe"))
                .thenThrow(new CategoriaNoEncontradaException());

        mvc.perform(put(RUTA + "/no-existe")
                        .with(user(CORREO).roles("CLIENTE"))
                        .with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
    void quitarEliminaLaCategoriaDeFavoritas() throws Exception {
        when(categoriaFavoritaService.quitar(CORREO, CATEGORIA_ID)).thenReturn(List.of());

        mvc.perform(delete(RUTA + "/" + CATEGORIA_ID)
                        .with(user(CORREO).roles("CLIENTE"))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        verify(categoriaFavoritaService).quitar(CORREO, CATEGORIA_ID);
    }

    @Test
    void vendedorYAdministradorNoPuedenUsarElEndpoint() throws Exception {
        mvc.perform(get(RUTA)
                        .with(user("vendedor@test.com").roles("VENDEDOR")))
                .andExpect(status().isForbidden());

        mvc.perform(put(RUTA + "/" + CATEGORIA_ID)
                        .with(user("admin@test.com").roles("ADMIN"))
                        .with(csrf()))
                .andExpect(status().isForbidden());

        verifyNoInteractions(categoriaFavoritaService);
    }

    @Test
    void rechazaPeticionesSinAutenticacion() throws Exception {
        mvc.perform(get(RUTA))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(categoriaFavoritaService);
    }

    @Test
    void rechazaModificacionesSinCsrf() throws Exception {
        mvc.perform(put(RUTA + "/" + CATEGORIA_ID)
                        .with(user(CORREO).roles("CLIENTE")))
                .andExpect(status().isForbidden());

        mvc.perform(delete(RUTA + "/" + CATEGORIA_ID)
                        .with(user(CORREO).roles("CLIENTE")))
                .andExpect(status().isForbidden());

        verifyNoInteractions(categoriaFavoritaService);
    }
}
