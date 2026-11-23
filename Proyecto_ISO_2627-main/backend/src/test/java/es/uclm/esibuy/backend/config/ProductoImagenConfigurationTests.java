package es.uclm.esibuy.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

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

    @Test
    void laEntregaLocalAnadeLasCabecerasSeguras() throws Exception {
        var respuesta = mockMvc.perform(get("/product-images/foto.png"))
                .andExpect(status().isOk())
                .andReturn().getResponse();

        assertEquals("nosniff", respuesta.getHeader("X-Content-Type-Options"));
        assertEquals("default-src 'none'; sandbox", respuesta.getHeader("Content-Security-Policy"));
        assertEquals("inline; filename=\"imagen\"", respuesta.getHeader("Content-Disposition"));
        assertNull(respuesta.getHeader("Cross-Origin-Resource-Policy"));
    }
}
