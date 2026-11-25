package es.uclm.esibuy.backend.controllers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.server.ResponseStatusException;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dto.TwoFactorConfirmationResponse;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;
import es.uclm.esibuy.backend.model.Administrador;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.services.PerfilService;
import es.uclm.esibuy.backend.services.SesionService;
import es.uclm.esibuy.backend.services.TotpService;

// T-13: al activar o desactivar el TOTP o el código por correo se rota el identificador de la sesión
// (la sesión conserva sus datos) y se cierran las demás; si el cambio falla, la sesión no se toca.
@WebMvcTest(controllers = PerfilController.class)
@Import({ SecurityConfiguration.class, SesionService.class })
class PerfilControllerSesionTests {

    private static final String CORREO = "ana@esibuy.com";
    private static final String OTRA_SESION = "sesion-de-otro-navegador";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SessionRegistry registro;

    @MockitoBean
    private TotpService totpService;

    @MockitoBean
    private PerfilService perfilService;

    private MockHttpSession sesionRegistrada() {
        MockHttpSession sesion = new MockHttpSession();
        sesion.setAttribute("marca", "valor");
        registro.registerNewSession(sesion.getId(), CORREO);
        registro.registerNewSession(OTRA_SESION, CORREO);
        return sesion;
    }

    private MvcResult ejecutar(MockHttpServletRequestBuilder peticion, MockHttpSession sesion) throws Exception {
        return mockMvc.perform(peticion.session(sesion)
                        .with(user(CORREO).roles("CLIENTE")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON))
                .andReturn();
    }

    private void assertRotada(MvcResult resultado, String idAnterior) {
        String idNuevo = resultado.getRequest().getSession(false).getId();
        assertNotEquals(idAnterior, idNuevo);
        assertEquals("valor", resultado.getRequest().getSession(false).getAttribute("marca"));
        assertFalse(registro.getSessionInformation(idNuevo).isExpired());
        assertTrue(registro.getSessionInformation(OTRA_SESION).isExpired());
    }

    private void assertNoRotada(MvcResult resultado, String idAnterior) {
        assertEquals(idAnterior, resultado.getRequest().getSession(false).getId());
        assertFalse(registro.getSessionInformation(idAnterior).isExpired());
        assertFalse(registro.getSessionInformation(OTRA_SESION).isExpired());
    }

    @Test
    void activarElTotpRotaLaSesionYCierraLasDemas() throws Exception {
        when(totpService.buscarUsuario(CORREO)).thenReturn(new Cliente());
        when(totpService.confirmarConfiguracion(org.mockito.ArgumentMatchers.any(), eq("123456")))
                .thenReturn(new TwoFactorConfirmationResponse(true, List.of("codigo-1")));
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(post("/usuarios/2fa/confirmar").content("{\"code\":\"123456\"}"), sesion);

        assertEquals(200, resultado.getResponse().getStatus());
        assertRotada(resultado, idAnterior);
    }

    @Test
    void siFallaLaActivacionDelTotpLaSesionNoCambia() throws Exception {
        when(totpService.buscarUsuario(CORREO)).thenReturn(new Cliente());
        when(totpService.confirmarConfiguracion(org.mockito.ArgumentMatchers.any(), anyString()))
                .thenThrow(new DatosNoValidosException("El código TOTP no es válido o ya se ha utilizado."));
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(post("/usuarios/2fa/confirmar").content("{\"code\":\"000000\"}"), sesion);

        assertEquals(400, resultado.getResponse().getStatus());
        assertNoRotada(resultado, idAnterior);
    }

    @Test
    void desactivarElTotpRotaLaSesionYCierraLasDemas() throws Exception {
        when(totpService.buscarUsuario(CORREO)).thenReturn(new Cliente());
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(delete("/usuarios/2fa").content("{\"code\":\"123456\"}"), sesion);

        assertEquals(204, resultado.getResponse().getStatus());
        assertRotada(resultado, idAnterior);
    }

    @Test
    void siFallaLaDesactivacionDelTotpLaSesionNoCambia() throws Exception {
        when(totpService.buscarUsuario(CORREO)).thenReturn(new Cliente());
        doThrow(new DatosNoValidosException("El código del segundo factor no es válido o ya se ha utilizado."))
                .when(totpService).desactivar(org.mockito.ArgumentMatchers.any(), anyString());
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(delete("/usuarios/2fa").content("{\"code\":\"000000\"}"), sesion);

        assertEquals(400, resultado.getResponse().getStatus());
        assertNoRotada(resultado, idAnterior);
    }

    @Test
    void desactivarElTotpDeUnRolObligatorioNoRotaLaSesion() throws Exception {
        when(totpService.buscarUsuario(CORREO)).thenReturn(new Administrador());
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(delete("/usuarios/2fa").content("{\"code\":\"123456\"}"), sesion);

        assertEquals(403, resultado.getResponse().getStatus());
        assertNoRotada(resultado, idAnterior);
    }

    @Test
    void desactivarElTotpConElCodigoPorCorreoActivoNoRotaLaSesion() throws Exception {
        Cliente cliente = new Cliente();
        cliente.setEmailOtpActivado(true);
        when(totpService.buscarUsuario(CORREO)).thenReturn(cliente);
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(delete("/usuarios/2fa").content("{\"code\":\"123456\"}"), sesion);

        assertEquals(409, resultado.getResponse().getStatus());
        assertNoRotada(resultado, idAnterior);
    }

    @Test
    void cambiarElCodigoPorCorreoRotaLaSesionYCierraLasDemas() throws Exception {
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(put("/usuarios/3fa/preferencia").content("{\"activado\":true}"), sesion);

        assertEquals(204, resultado.getResponse().getStatus());
        assertRotada(resultado, idAnterior);
    }

    @Test
    void siSeRechazaElCambioDelCodigoPorCorreoLaSesionNoCambia() throws Exception {
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                "Activa primero el segundo factor TOTP."))
                .when(perfilService).modificarPreferenciaTercerFactor(anyString(), org.mockito.ArgumentMatchers.anyBoolean());
        MockHttpSession sesion = sesionRegistrada();
        String idAnterior = sesion.getId();

        MvcResult resultado = ejecutar(put("/usuarios/3fa/preferencia").content("{\"activado\":true}"), sesion);

        assertEquals(409, resultado.getResponse().getStatus());
        assertNoRotada(resultado, idAnterior);
    }

    @Test
    void sinAutenticarNoSeRotaNiSeTocaNada() throws Exception {
        mockMvc.perform(put("/usuarios/3fa/preferencia").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"activado\":true}"))
                .andExpect(status().is4xxClientError());
    }
}
