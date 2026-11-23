package es.uclm.esibuy.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

class LimiteApiServiceTests {

    // Reloj que se puede adelantar a mano.
    private static final class RelojManual extends Clock {
        private Instant ahora = Instant.parse("2026-11-23T10:00:00Z");

        void avanzar(Duration duracion) {
            ahora = ahora.plus(duracion);
        }

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return ahora;
        }
    }

    private final RelojManual reloj = new RelojManual();
    private final LimiteApiService servicio = new LimiteApiService(60, Duration.ofMinutes(1), reloj);

    @Test
    void permiteSesentaPeticionesPorMinutoYRechazaLaSesentaYUna() {
        for (int i = 0; i < 60; i++) {
            assertTrue(servicio.registrar("usuario:ana").permitida(), "petición " + (i + 1));
        }

        LimiteApiService.Resultado rechazada = servicio.registrar("usuario:ana");

        assertFalse(rechazada.permitida());
        assertEquals(60, rechazada.retryAfterSegundos());
    }

    @Test
    void laVentanaSeRenuevaYElRetryAfterDecreceConElTiempo() {
        for (int i = 0; i < 60; i++) {
            servicio.registrar("usuario:ana");
        }
        reloj.avanzar(Duration.ofSeconds(45));

        assertEquals(15, servicio.registrar("usuario:ana").retryAfterSegundos());

        reloj.avanzar(Duration.ofSeconds(15));
        assertTrue(servicio.registrar("usuario:ana").permitida());
    }

    @Test
    void cadaClaveTieneSuPropioCupo() {
        for (int i = 0; i < 60; i++) {
            servicio.registrar("usuario:ana");
        }

        assertFalse(servicio.registrar("usuario:ana").permitida());
        assertTrue(servicio.registrar("usuario:luis").permitida());
        assertTrue(servicio.registrar("ip:203.0.113.9").permitida());
    }

    @Test
    void lasPeticionesRechazadasNoAlarganElBloqueo() {
        for (int i = 0; i < 60; i++) {
            servicio.registrar("usuario:ana");
        }
        for (int i = 0; i < 100; i++) {
            assertFalse(servicio.registrar("usuario:ana").permitida());
        }

        reloj.avanzar(Duration.ofSeconds(61));

        assertTrue(servicio.registrar("usuario:ana").permitida());
    }

    @Test
    void elLimiteYLaVentanaDebenSerPositivos() {
        assertThrows(IllegalArgumentException.class, () -> new LimiteApiService(0, Duration.ofMinutes(1), reloj));
        assertThrows(IllegalArgumentException.class, () -> new LimiteApiService(60, Duration.ZERO, reloj));
    }

    @Test
    void elLimiteEsConfigurable() {
        LimiteApiService pequeno = new LimiteApiService(2, Duration.ofSeconds(10), reloj);

        assertTrue(pequeno.registrar("k").permitida());
        assertTrue(pequeno.registrar("k").permitida());
        assertFalse(pequeno.registrar("k").permitida());
    }
}
