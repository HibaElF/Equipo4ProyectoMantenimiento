package es.uclm.esibuy.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import es.uclm.esibuy.backend.dao.LoginAttemptStore;

class LimiteRegistroFilterTests {

    private final LoginAttemptStore almacen = mock(LoginAttemptStore.class);
    private final LimiteRegistroFilter filtro = new LimiteRegistroFilter(() -> almacen, 5, 900);

    private MockFilterChain ejecutar(String metodo, String ruta, String ip, MockHttpServletResponse respuesta)
            throws Exception {
        MockHttpServletRequest peticion = new MockHttpServletRequest(metodo, ruta);
        peticion.setRemoteAddr(ip);
        MockFilterChain cadena = new MockFilterChain();
        filtro.doFilter(peticion, respuesta, cadena);
        return cadena;
    }

    @Test
    void dentroDelLimiteLaPeticionContinuaYSeReservaPorIp() throws Exception {
        when(almacen.reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt())).thenReturn(0);
        MockHttpServletResponse respuesta = new MockHttpServletResponse();

        MockFilterChain cadena = ejecutar("POST", "/cliente/register", "203.0.113.9", respuesta);

        assertNotNull(cadena.getRequest());
        assertEquals(200, respuesta.getStatus());
        verify(almacen).reservar(eq("registro-ip"), eq("203.0.113.9"), any(Instant.class), eq(900), eq(5));
    }

    @Test
    void superadoElLimiteResponde429ConRetryAfterYCortaLaCadena() throws Exception {
        when(almacen.reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt())).thenReturn(321);
        MockHttpServletResponse respuesta = new MockHttpServletResponse();

        MockFilterChain cadena = ejecutar("POST", "/vendedor/register", "203.0.113.9", respuesta);

        assertNull(cadena.getRequest());
        assertEquals(429, respuesta.getStatus());
        assertEquals("321", respuesta.getHeader("Retry-After"));
        assertEquals("application/json", respuesta.getContentType().split(";")[0]);
        assertEquals("{\"error\":\"Demasiados intentos de registro desde esta conexión. "
                + "Inténtalo de nuevo en 321 segundos.\"}", respuesta.getContentAsString());
    }

    @Test
    void soloLimitaElPostDeLasDosRutasDeAlta() throws Exception {
        for (String[] caso : new String[][] {
                { "GET", "/cliente/register" },
                { "OPTIONS", "/cliente/register" },
                { "POST", "/usuarios/login" },
                { "POST", "/administrador/register" },
                { "POST", "/cliente/register/otra" } }) {
            MockFilterChain cadena = ejecutar(caso[0], caso[1], "203.0.113.9", new MockHttpServletResponse());
            assertNotNull(cadena.getRequest(), caso[0] + " " + caso[1]);
        }

        verify(almacen, never()).reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt());
    }

    @Test
    void sinAlmacenDisponibleNoLimita() throws Exception {
        LimiteRegistroFilter sinAlmacen = new LimiteRegistroFilter(() -> null, 5, 900);
        MockHttpServletRequest peticion = new MockHttpServletRequest("POST", "/cliente/register");
        MockFilterChain cadena = new MockFilterChain();

        sinAlmacen.doFilter(peticion, new MockHttpServletResponse(), cadena);

        assertNotNull(cadena.getRequest());
    }
}
