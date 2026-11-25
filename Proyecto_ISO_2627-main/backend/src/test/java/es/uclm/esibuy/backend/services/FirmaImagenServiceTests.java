package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;

import org.junit.jupiter.api.Test;

import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.services.FirmaImagenService.Resultado;

public class FirmaImagenServiceTests {

    // Clave claramente falsa de 32 bytes.
    public static final String CLAVE = Base64.getEncoder().encodeToString("clave-de-prueba-falsa-imagenes-3".getBytes());
    private static final Instant AHORA = Instant.parse("2026-11-23T10:20:30Z");

    private static FirmaImagenService servicio(Instant instante, Duration vigencia) {
        return new FirmaImagenService(CLAVE, vigencia, Clock.fixed(instante, ZoneOffset.UTC));
    }

    private static String parametro(String url, String nombre) {
        String consulta = url.substring(url.indexOf('?') + 1);
        for (String parte : consulta.split("&")) {
            if (parte.startsWith(nombre + "=")) {
                return parte.substring(nombre.length() + 1);
            }
        }
        return null;
    }

    @Test
    void firmaYVerificaUnaImagen() {
        FirmaImagenService servicio = servicio(AHORA, Duration.ofHours(2));

        String url = servicio.firmar("/product-images/abc.png");

        assertTrue(url.startsWith("/product-images/abc.png?exp="));
        assertEquals(Resultado.VALIDA, servicio.verificar("abc.png", parametro(url, "exp"), parametro(url, "sig")));
    }

    @Test
    void laCaducidadSeRedondeaALaSiguienteHoraYLaUrlEsEstableDentroDeLaVentana() {
        String primera = servicio(AHORA, Duration.ofHours(2)).firmar("/product-images/abc.png");
        String segunda = servicio(AHORA.plusSeconds(600), Duration.ofHours(2)).firmar("/product-images/abc.png");

        assertEquals(primera, segunda);
        long expiracion = Long.parseLong(parametro(primera, "exp"));
        assertEquals(0, expiracion % 3600);
        assertTrue(expiracion >= AHORA.plus(Duration.ofHours(2)).getEpochSecond());
        assertTrue(expiracion < AHORA.plus(Duration.ofHours(3)).getEpochSecond());
    }

    @Test
    void rechazaFirmaManipulada() {
        FirmaImagenService servicio = servicio(AHORA, Duration.ofHours(2));
        String url = servicio.firmar("/product-images/abc.png");
        String exp = parametro(url, "exp");
        String sig = parametro(url, "sig");

        assertEquals(Resultado.INVALIDA, servicio.verificar("abc.png", exp, sig.substring(0, sig.length() - 2) + "AA"));
        assertEquals(Resultado.INVALIDA, servicio.verificar("otra.png", exp, sig));
        assertEquals(Resultado.INVALIDA, servicio.verificar("abc.png", String.valueOf(Long.parseLong(exp) + 3600), sig));
        assertEquals(Resultado.INVALIDA, servicio.verificar("abc.png", "no-numero", sig));
        assertEquals(Resultado.INVALIDA, servicio.verificar("abc.png", null, sig));
        assertEquals(Resultado.INVALIDA, servicio.verificar("abc.png", exp, null));
        assertEquals(Resultado.INVALIDA, servicio.verificar("", exp, sig));
    }

    @Test
    void unaFirmaDeOtraClaveNoSeAcepta() {
        String otraClave = Base64.getEncoder().encodeToString("otra-clave-de-prueba-falsa-12345".getBytes());
        String url = new FirmaImagenService(otraClave, Duration.ofHours(2), Clock.fixed(AHORA, ZoneOffset.UTC))
                .firmar("/product-images/abc.png");

        assertEquals(Resultado.INVALIDA,
                servicio(AHORA, Duration.ofHours(2)).verificar("abc.png", parametro(url, "exp"), parametro(url, "sig")));
    }

    @Test
    void unaFirmaCorrectaPeroCaducadaSeDistingueDeUnaInvalida() {
        String url = servicio(AHORA, Duration.ofHours(2)).firmar("/product-images/abc.png");

        FirmaImagenService mastarde = servicio(AHORA.plus(Duration.ofHours(4)), Duration.ofHours(2));

        assertEquals(Resultado.CADUCADA, mastarde.verificar("abc.png", parametro(url, "exp"), parametro(url, "sig")));
    }

    @Test
    void laVigenciaEsConfigurable() {
        long corta = Long.parseLong(parametro(servicio(AHORA, Duration.ofMinutes(10)).firmar("/product-images/a.png"), "exp"));
        long larga = Long.parseLong(parametro(servicio(AHORA, Duration.ofHours(24)).firmar("/product-images/a.png"), "exp"));

        assertTrue(larga - corta >= Duration.ofHours(23).getSeconds());
    }

    @Test
    void loQueNoEsUnaImagenPropiaSeDevuelveTalCual() {
        FirmaImagenService servicio = servicio(AHORA, Duration.ofHours(2));

        assertNull(servicio.firmar(null));
        assertEquals("", servicio.firmar(""));
        assertEquals("https://ejemplo.test/a.png", servicio.firmar("https://ejemplo.test/a.png"));
        assertEquals("/product-images/", servicio.firmar("/product-images/"));
        assertEquals("/product-images/../x.png", servicio.firmar("/product-images/../x.png"));
    }

    @Test
    void sinClaveOConUnaClaveInvalidaNoArranca() {
        Clock reloj = Clock.systemUTC();
        assertThrows(IllegalStateException.class, () -> new FirmaImagenService("", Duration.ofHours(2), reloj));
        assertThrows(IllegalStateException.class, () -> new FirmaImagenService(null, Duration.ofHours(2), reloj));
        assertThrows(IllegalStateException.class, () -> new FirmaImagenService("no-es-base64!", Duration.ofHours(2), reloj));
        assertThrows(IllegalStateException.class,
                () -> new FirmaImagenService(Base64.getEncoder().encodeToString(new byte[16]), Duration.ofHours(2), reloj));
        assertThrows(IllegalStateException.class, () -> new FirmaImagenService(CLAVE, Duration.ZERO, reloj));
    }

    @Test
    void elServicioSinFirmaDevuelveElValorSinTocarlo() {
        FirmaImagenService sinFirma = FirmaImagenService.sinFirma();

        assertEquals("/product-images/abc.png", sinFirma.firmar("/product-images/abc.png"));
        assertEquals(Resultado.INVALIDA, sinFirma.verificar("abc.png", "1", "x"));
    }

    @Test
    void lasListasYFavoritosTambienDevuelvenLaUrlFirmada() {
        FirmaImagenService servicio = servicio(AHORA, Duration.ofHours(2));
        Producto producto = new Producto();
        producto.setNombre("Teclado");
        producto.setPrecio(10.0);
        producto.setStock(3);
        producto.setEsVisible(true);
        producto.setImagen("/product-images/c.png");

        String imagen = FavoritoService.presentarProducto("p1", producto, false, servicio).imagen();

        assertTrue(imagen.startsWith("/product-images/c.png?exp="));
        assertTrue(imagen.contains("&sig="));
    }
}
