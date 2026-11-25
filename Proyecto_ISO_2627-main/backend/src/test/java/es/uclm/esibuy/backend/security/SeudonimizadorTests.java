package es.uclm.esibuy.backend.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class SeudonimizadorTests {

    private static final String PEPPER = "pepper-falso-solo-para-pruebas-0123456789";

    @Test
    void esEstableYNoRevelaElValorOriginal() {
        Seudonimizador seudonimizador = new Seudonimizador(PEPPER);

        String primero = seudonimizador.seudonimizar("cliente@example.com");

        assertEquals(primero, seudonimizador.seudonimizar("cliente@example.com"));
        assertFalse(primero.contains("cliente"));
        assertEquals(16, primero.length());
    }

    @Test
    void valoresDistintosOPepperDistintoDanIdentificadoresDistintos() {
        Seudonimizador seudonimizador = new Seudonimizador(PEPPER);
        Seudonimizador otro = new Seudonimizador("otro-pepper-falso-solo-para-pruebas-9876543210");

        assertNotEquals(seudonimizador.seudonimizar("a@example.com"), seudonimizador.seudonimizar("b@example.com"));
        assertNotEquals(seudonimizador.seudonimizar("a@example.com"), otro.seudonimizar("a@example.com"));
    }

    @Test
    void unValorVacioSeIdentificaComoAnonimo() {
        Seudonimizador seudonimizador = new Seudonimizador(PEPPER);

        assertEquals("anonimo", seudonimizador.seudonimizar(null));
        assertEquals("anonimo", seudonimizador.seudonimizar("  "));
    }

    @Test
    void sinPepperNoSePuedeCrear() {
        assertThrows(IllegalArgumentException.class, () -> new Seudonimizador(""));
        assertThrows(IllegalArgumentException.class, () -> new Seudonimizador(null));
    }
}
