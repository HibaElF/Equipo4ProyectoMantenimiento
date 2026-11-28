package es.uclm.esibuy.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import es.uclm.esibuy.backend.services.FirmaImagenService;

// T-35: la entrega local de imágenes lleva cabeceras seguras, y la CSP estricta de la imagen prevalece
// sobre la CSP global de la aplicación (T-21).
@WebMvcTest(controllers = ProductoImagenConfigurationTests.Vacio.class)
@Import({ SecurityConfiguration.class, ProductoImagenConfiguration.class, ProductoImagenConfigurationTests.Vacio.class })
class ProductoImagenConfigurationTests {

    @org.springframework.web.bind.annotation.RestController
    static class Vacio {
    }

    private static final Path DIRECTORIO = crearDirectorio();

    private static Path crearDirectorio() {
        try {
            Path directorio = Files.createTempDirectory("imagenes-t35");
            Files.write(directorio.resolve("foto.png"), new byte[] { 1, 2, 3 });
            directorio.toFile().deleteOnExit();
            directorio.resolve("foto.png").toFile().deleteOnExit();
            return directorio;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void propiedades(DynamicPropertyRegistry registro) {
        registro.add("app.productos.imagenes.directorio", DIRECTORIO::toString);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FirmaImagenService firmas;

    @Test
    void laEntregaLocalAnadeLasCabecerasSeguras() throws Exception {
        var respuesta = mockMvc.perform(get(firmas.firmar("/product-images/foto.png")))
                .andExpect(status().isOk())
                .andReturn().getResponse();

        assertEquals("nosniff", respuesta.getHeader("X-Content-Type-Options"));
        assertEquals("default-src 'none'; sandbox", respuesta.getHeader("Content-Security-Policy"));
        assertEquals("inline; filename=\"imagen\"", respuesta.getHeader("Content-Disposition"));
        assertNull(respuesta.getHeader("Cross-Origin-Resource-Policy"));
    }

    // T-34: la entrega local exige URL firmada y vigente.
    @Test
    void laEntregaLocalExigeLaUrlFirmada() throws Exception {
        mockMvc.perform(get("/product-images/foto.png")).andExpect(status().isForbidden());
        mockMvc.perform(get("/product-images/foto.png?exp=9999999999&sig=falsa")).andExpect(status().isForbidden());
        mockMvc.perform(get(firmas.firmar("/product-images/foto.png"))).andExpect(status().isOk());
    }

    // C-04: modo local, con la cadena de seguridad real y la ruta codificada.
    @Test
    void laEntregaLocalAplicaLaFirmaAunqueLaRutaVayaCodificada() throws Exception {
        mockMvc.perform(get(URI.create("/%70roduct-images/foto.png"))).andExpect(status().isForbidden());
        mockMvc.perform(get(URI.create("/product%2Dimages/foto.png"))).andExpect(status().isForbidden());

        String firmada = firmas.firmar("/product-images/foto.png");
        mockMvc.perform(get(URI.create(firmada.replace("/foto.png", "/%66oto.png"))))
                .andExpect(status().isOk());
    }
}
