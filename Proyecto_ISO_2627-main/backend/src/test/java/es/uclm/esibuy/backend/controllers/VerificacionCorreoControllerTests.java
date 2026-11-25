package es.uclm.esibuy.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.exceptions.TokenVerificacionCorreoInvalidoException;
import es.uclm.esibuy.backend.services.VerificacionCorreoService;

@WebMvcTest(controllers = { VerificacionCorreoController.class, SpaController.class })
@Import(SecurityConfiguration.class)
class VerificacionCorreoControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VerificacionCorreoService servicio;

    @Test
    void elEnlaceValidoSeVerificaSinSesionIniciadaConCsrf() throws Exception {
        mockMvc.perform(post("/usuarios/verificar-correo").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"token-de-prueba\"}"))
                .andExpect(status().isNoContent());

        verify(servicio).verificar("token-de-prueba");
    }

    @Test
    void sinTokenCsrfRecibeUn403() throws Exception {
        mockMvc.perform(post("/usuarios/verificar-correo")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"token-de-prueba\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(servicio);
    }

    @Test
    void unEnlaceInvalidoCaducadoOUsadoDevuelveUn400Generico() throws Exception {
        doThrow(new TokenVerificacionCorreoInvalidoException()).when(servicio).verificar(anyString());

        String cuerpo = mockMvc.perform(post("/usuarios/verificar-correo").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"cualquiera\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("El enlace de verificación no es válido o ha caducado."))
                .andReturn().getResponse().getContentAsString();

        assertFalse(cuerpo.contains("cualquiera"));
    }

    @Test
    void rechazaTokensVaciosOExcesivamenteLargosSinLlegarAlServicio() throws Exception {
        for (String cuerpo : new String[] { "{}", "{\"token\":\"\"}", "{\"token\":\"" + "a".repeat(129) + "\"}" }) {
            mockMvc.perform(post("/usuarios/verificar-correo").with(csrf())
                            .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(servicio);
    }

    @Test
    void laPaginaDeVerificacionEsUnaRutaPublicaDeLaAplicacionAngular() throws Exception {
        mockMvc.perform(get("/verificar-correo").param("token", "x"))
                .andExpect(status().isOk());
    }
}
