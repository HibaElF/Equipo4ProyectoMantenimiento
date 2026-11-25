package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;

class SesionServiceTests {

    private static final String CORREO = "cliente@example.com";

    private final SessionRegistry registro = new SessionRegistryImpl();
    private final SesionService servicio = new SesionService(registro);

    @Test
    void rotarSesionCambiaElIdentificadorConservaLaSesionYCierraLasDemas() {
        MockHttpSession sesion = new MockHttpSession();
        sesion.setAttribute("marca", "valor");
        String idAnterior = sesion.getId();
        MockHttpServletRequest peticion = new MockHttpServletRequest();
        peticion.setSession(sesion);
        servicio.registrarSesion(idAnterior, CORREO);
        servicio.registrarSesion("sesion-de-otro-navegador", CORREO);
        servicio.registrarSesion("sesion-de-otro-usuario", "otro@example.com");

        servicio.rotarSesion(peticion, "  Cliente@Example.com ");

        String idNuevo = peticion.getSession(false).getId();
        assertNotEquals(idAnterior, idNuevo);
        assertEquals("valor", peticion.getSession(false).getAttribute("marca"));
        assertFalse(registro.getSessionInformation(idNuevo).isExpired());
        assertTrue(registro.getSessionInformation("sesion-de-otro-navegador").isExpired());
        assertFalse(registro.getSessionInformation("sesion-de-otro-usuario").isExpired());
    }

    @Test
    void sinSesionActivaCierraTodasLasSesionesDelUsuario() {
        servicio.registrarSesion("sesion-1", CORREO);

        servicio.rotarSesion(new MockHttpServletRequest(), CORREO);

        assertTrue(registro.getSessionInformation("sesion-1").isExpired());
    }

    @Test
    void cerrarOtrasSesionesRespetaLaActualYTolerasEmailsVacios() {
        servicio.registrarSesion("actual", CORREO);
        servicio.registrarSesion("otra", CORREO);

        servicio.cerrarOtrasSesiones(CORREO, "actual");
        servicio.cerrarOtrasSesiones(null, "actual");
        servicio.cerrarOtrasSesiones("  ", "actual");

        assertFalse(registro.getSessionInformation("actual").isExpired());
        assertTrue(registro.getSessionInformation("otra").isExpired());
        assertNull(registro.getSessionInformation("inexistente"));
    }
}
