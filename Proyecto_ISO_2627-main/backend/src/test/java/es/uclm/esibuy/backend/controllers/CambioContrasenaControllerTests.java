package es.uclm.esibuy.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;
import es.uclm.esibuy.backend.exceptions.InvalidRegistrationException;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.services.CambioContrasenaService;
import es.uclm.esibuy.backend.services.SesionService;

@WebMvcTest(controllers = CambioContrasenaController.class)
@Import({ SecurityConfiguration.class, SesionService.class })
class CambioContrasenaControllerTests {

    private static final String CORREO = "cliente@example.com";
    private static final String CUERPO = """
            {"contrasenaActual":"ClaveActual9!x","nuevaContrasena":"NuevaClaveSegura7#"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionRegistry sessionRegistry;

    @MockitoBean
    private CambioContrasenaService servicio;

    @Test
    void devuelve204RotaLaSesionActualYCierraLasDemas() throws Exception {
        MockHttpSession actual = new MockHttpSession();
        String idAnterior = actual.getId();
        sessionRegistry.registerNewSession(idAnterior, CORREO);
        sessionRegistry.registerNewSession("sesion-de-otro-navegador", CORREO);

        MvcResult resultado = mockMvc.perform(put("/usuarios/contrasena")
                        .session(actual)
                        .with(user(CORREO).roles("CLIENTE"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO))
                .andExpect(status().isNoContent())
                .andReturn();

        verify(servicio).cambiar(org.mockito.ArgumentMatchers.eq(CORREO), anyString(),
                org.mockito.ArgumentMatchers.eq("ClaveActual9!x"),
                org.mockito.ArgumentMatchers.eq("NuevaClaveSegura7#"));
        String idNuevo = resultado.getRequest().getSession(false).getId();
        assertNotEquals(idAnterior, idNuevo);
        // La sesión actual sigue viva con su id nuevo; la de otro navegador queda invalidada.
        assertFalse(sessionRegistry.getSessionInformation(idNuevo).isExpired());
        assertTrue(sessionRegistry.getSessionInformation("sesion-de-otro-navegador").isExpired());
    }

    @Test
    void sinSesionIniciadaNoSePuedeCambiarLaContrasena() throws Exception {
        mockMvc.perform(put("/usuarios/contrasena")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO))
                .andExpect(status().is4xxClientError());

        verifyNoInteractions(servicio);
    }

    @Test
    void exigeElTokenCsrf() throws Exception {
        mockMvc.perform(put("/usuarios/contrasena")
                        .with(user(CORREO).roles("CLIENTE"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO))
                .andExpect(status().isForbidden());

        verifyNoInteractions(servicio);
    }

    @Test
    void rechazaCuerposInvalidosConUn400() throws Exception {
        String[] invalidos = {
                "{}",
                "{\"contrasenaActual\":\"\",\"nuevaContrasena\":\"NuevaClaveSegura7#\"}",
                "{\"contrasenaActual\":\"ClaveActual9!x\",\"nuevaContrasena\":\"" + "a".repeat(129) + "\"}",
                "{esto no es json" };
        for (String cuerpo : invalidos) {
            mockMvc.perform(put("/usuarios/contrasena")
                            .with(user(CORREO).roles("CLIENTE"))
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(cuerpo))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(servicio);
    }

    @Test
    void laContrasenaActualIncorrectaDevuelve400ConSuMensajeYNoRotaLaSesion() throws Exception {
        doThrow(new DatosNoValidosException("La contraseña actual no es correcta."))
                .when(servicio).cambiar(anyString(), anyString(), anyString(), anyString());
        sessionRegistry.registerNewSession("otra-sesion", CORREO);

        mockMvc.perform(put("/usuarios/contrasena")
                        .with(user(CORREO).roles("CLIENTE"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("La contraseña actual no es correcta."));

        assertFalse(sessionRegistry.getSessionInformation("otra-sesion").isExpired());
    }

    @Test
    void unaNuevaContrasenaQueIncumpleLaPoliticaDevuelve400() throws Exception {
        doThrow(new InvalidRegistrationException("contrasena", "La contraseña no puede contener datos personales."))
                .when(servicio).cambiar(anyString(), anyString(), anyString(), anyString());

        mockMvc.perform(put("/usuarios/contrasena")
                        .with(user(CORREO).roles("CLIENTE"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("La contraseña no puede contener datos personales."));
    }

    @Test
    void elLimiteDeIntentosDevuelve429ConRetryAfter() throws Exception {
        doThrow(new LoginRateLimitException(45))
                .when(servicio).cambiar(anyString(), anyString(), anyString(), anyString());

        mockMvc.perform(put("/usuarios/contrasena")
                        .with(user(CORREO).roles("CLIENTE"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CUERPO))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "45"));

        verify(servicio).cambiar(anyString(), anyString(), anyString(), anyString());
    }
}
