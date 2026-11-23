package es.uclm.esibuy.backend.controllers;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import es.uclm.esibuy.backend.config.SecurityConfiguration;
import es.uclm.esibuy.backend.dao.LoginAttemptStore;
import es.uclm.esibuy.backend.dto.RegistroPublicoResponse;
import es.uclm.esibuy.backend.services.ClienteService;
import es.uclm.esibuy.backend.services.PerfilService;
import es.uclm.esibuy.backend.services.ProductoService;
import es.uclm.esibuy.backend.services.SesionService;
import es.uclm.esibuy.backend.services.VendedorService;

// T-10: el alta pública exige token CSRF y tiene un límite por IP, con la cadena de seguridad real.
@WebMvcTest(controllers = { ClienteController.class, VendedorController.class })
@Import(SecurityConfiguration.class)
class RegistroPublicoSeguridadTests {

    private static final String CLIENTE = """
            {"nombre":"Ada","apellidos":"Lovelace","fechaNacimiento":"1990-12-10","dniNif":"12345678Z",
             "email":"ada@example.com","contrasena":"ClaveSegura9!","esPremium":false}
            """;
    private static final String VENDEDOR = """
            {"nombre":"Luis","apellidos":"Martín","dniNif":"12345678Z","email":"luis@example.com",
             "contrasena":"ClaveSegura9!","categoriaId":"cat-1","nombreComercial":"UrbanStyle"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LoginAttemptStore almacen;

    @MockitoBean
    private ClienteService clienteService;

    @MockitoBean
    private VendedorService vendedorService;

    @MockitoBean
    private ProductoService productoService;

    @MockitoBean
    private PerfilService perfilService;

    @MockitoBean
    private SesionService sesionService;

    private RequestPostProcessor desdeIp(String ip) {
        return request -> {
            request.setRemoteAddr(ip);
            return request;
        };
    }

    @Test
    void sinTokenCsrfElAltaDeClienteYDeVendedorRecibeUn403SinConsumirCupo() throws Exception {
        mockMvc.perform(post("/cliente/register").contentType(MediaType.APPLICATION_JSON).content(CLIENTE))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/vendedor/register").contentType(MediaType.APPLICATION_JSON).content(VENDEDOR))
                .andExpect(status().isForbidden());

        verifyNoInteractions(clienteService, vendedorService, almacen);
    }

    @Test
    void conTokenCsrfElAltaSigueDevolviendoLaRespuestaUniforme202() throws Exception {
        when(almacen.reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt())).thenReturn(0);

        mockMvc.perform(post("/cliente/register").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(CLIENTE))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.mensaje").value(RegistroPublicoResponse.confirmacion().mensaje()));
        mockMvc.perform(post("/vendedor/register").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(VENDEDOR))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.mensaje").value(RegistroPublicoResponse.confirmacion().mensaje()));

        verify(clienteService).registrar(any());
        verify(vendedorService).registrar(any());
    }

    @Test
    void superadoElLimiteDeAltasPorIpResponde429ConRetryAfterYNoLlegaAlServicio() throws Exception {
        when(almacen.reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt())).thenReturn(120);

        mockMvc.perform(post("/cliente/register").with(csrf()).with(desdeIp("203.0.113.9"))
                        .contentType(MediaType.APPLICATION_JSON).content(CLIENTE))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "120"))
                .andExpect(jsonPath("$.error").exists());
        mockMvc.perform(post("/vendedor/register").with(csrf()).with(desdeIp("203.0.113.9"))
                        .contentType(MediaType.APPLICATION_JSON).content(VENDEDOR))
                .andExpect(status().isTooManyRequests());

        verifyNoInteractions(clienteService, vendedorService);
    }

    @Test
    void elLimiteSeAplicaPorIpConCincoAltasCadaQuinceMinutosYNoPorCorreo() throws Exception {
        when(almacen.reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt())).thenReturn(0);

        mockMvc.perform(post("/cliente/register").with(csrf()).with(desdeIp("203.0.113.9"))
                        .contentType(MediaType.APPLICATION_JSON).content(CLIENTE))
                .andExpect(status().isAccepted());

        verify(almacen).reservar(eq("registro-ip"), eq("203.0.113.9"), any(Instant.class), eq(900), eq(5));
    }

    @Test
    void laRespuestaDeLimiteNoRevelaLaIpNiElCorreo() throws Exception {
        when(almacen.reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt())).thenReturn(30);

        String cuerpo = mockMvc.perform(post("/cliente/register").with(csrf()).with(desdeIp("203.0.113.9"))
                        .contentType(MediaType.APPLICATION_JSON).content(CLIENTE))
                .andReturn().getResponse().getContentAsString();

        org.junit.jupiter.api.Assertions.assertFalse(cuerpo.contains("203.0.113.9"));
        org.junit.jupiter.api.Assertions.assertFalse(cuerpo.contains("ada@example.com"));
    }

    @Test
    void otrasPeticionesNoConsumenElCupoDeAltas() throws Exception {
        mockMvc.perform(post("/cliente/otra-ruta").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"));

        verify(almacen, never()).reservar(anyString(), anyString(), any(Instant.class), anyInt(), anyInt());
    }
}
