package es.uclm.esibuy.backend.security;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import es.uclm.esibuy.backend.controllers.ProductoImagenMongoController;
import es.uclm.esibuy.backend.model.ProductoImagenDocumento;
import es.uclm.esibuy.backend.services.FirmaImagenService;
import es.uclm.esibuy.backend.services.FirmaImagenServiceTests;
import es.uclm.esibuy.backend.services.ProductoImagenMongoService;

// T-34, modo MongoDB: el filtro protege /product-images/** delante del controlador.
class FiltroImagenFirmadaTests {

    private static final String NOMBRE = "d776a673-37be-49e6-a534-c9cad518284b.png";
    private static final Instant AHORA = Instant.parse("2026-11-23T10:20:30Z");

    private MockMvc mockMvc;
    private FirmaImagenService firmas;
    private ProductoImagenMongoService mongo;

    @BeforeEach
    void preparar() {
        mongo = mock(ProductoImagenMongoService.class);
        when(mongo.obtener(NOMBRE)).thenReturn(
                Optional.of(new ProductoImagenDocumento(NOMBRE, "image/png", new byte[] { 1, 2, 3 })));
        firmas = new FirmaImagenService(FirmaImagenServiceTests.CLAVE, Duration.ofHours(2),
                Clock.fixed(AHORA, ZoneOffset.UTC));
        mockMvc = construir(firmas);
    }

    private MockMvc construir(FirmaImagenService servicio) {
        return MockMvcBuilders.standaloneSetup(new ProductoImagenMongoController(mongo))
                .addFilters(new FiltroImagenFirmada(servicio))
                .build();
    }

    @Test
    void unaUrlFirmadaYVigenteSirveLaImagen() throws Exception {
        mockMvc.perform(get(firmas.firmar("/product-images/" + NOMBRE)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; sandbox"));
    }

    @Test
    void sinFirmaOConFirmaInvalidaDa403() throws Exception {
        mockMvc.perform(get("/product-images/" + NOMBRE)).andExpect(status().isForbidden());
        mockMvc.perform(get("/product-images/" + NOMBRE + "?exp=9999999999&sig=falsa"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/product-images/" + NOMBRE + "?sig=falsa")).andExpect(status().isForbidden());
    }

    @Test
    void laFirmaDeOtraImagenNoSirve() throws Exception {
        String url = firmas.firmar("/product-images/otra.png");
        String consulta = url.substring(url.indexOf('?'));

        mockMvc.perform(get("/product-images/" + NOMBRE + consulta)).andExpect(status().isForbidden());
    }

    @Test
    void unaFirmaCaducadaDa410() throws Exception {
        String url = firmas.firmar("/product-images/" + NOMBRE);
        FirmaImagenService mastarde = new FirmaImagenService(FirmaImagenServiceTests.CLAVE, Duration.ofHours(2),
                Clock.fixed(AHORA.plus(Duration.ofHours(5)), ZoneOffset.UTC));

        construir(mastarde).perform(get(url)).andExpect(status().isGone());
    }

    @Test
    void otrasRutasNoSeVenAfectadas() throws Exception {
        mockMvc.perform(get("/otra-ruta")).andExpect(status().isNotFound());
    }

    // C-04: la ruta codificada se compara decodificada, igual que hace Spring MVC.
    @Test
    void sinFirmaDa403ConCualquierCodificacionDeLaRuta() throws Exception {
        for (String ruta : new String[] { "/%70roduct-images/", "/product%2Dimages/", "/product-images/%64" }) {
            String url = ruta.endsWith("%64") ? ruta + NOMBRE.substring(1) : ruta + NOMBRE;
            mockMvc.perform(get(URI.create(url))).andExpect(status().isForbidden());
        }
    }

    @Test
    void unaUrlFirmadaSigueSirviendoAunqueLaRutaVayaCodificada() throws Exception {
        String url = firmas.firmar("/product-images/" + NOMBRE);

        mockMvc.perform(get(URI.create(url.replace("/product-images/", "/%70roduct-images/"))))
                .andExpect(status().isOk());
        mockMvc.perform(get(URI.create(url.replace("/product-images/d", "/product-images/%64"))))
                .andExpect(status().isOk());
    }

    @Test
    void unaRutaConMasSegmentosBajoLasImagenesDa403() throws Exception {
        mockMvc.perform(get("/product-images/carpeta/" + NOMBRE)).andExpect(status().isForbidden());
        mockMvc.perform(get("/product-images/")).andExpect(status().isForbidden());
    }
}
