package es.uclm.esibuy.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class MdcTaskDecoratorTests {

    @AfterEach
    void limpiar() {
        MDC.clear();
    }

    @Test
    void laTareaVeElMdcDelHiloQueLaLanzo() throws Exception {
        MDC.put("correlationId", "abc12345");
        AtomicReference<String> visto = new AtomicReference<>();

        Runnable decorada = new MdcTaskDecorator().decorate(() -> visto.set(MDC.get("correlationId")));
        MDC.clear();
        Thread hilo = new Thread(decorada);
        hilo.start();
        hilo.join();

        assertEquals("abc12345", visto.get());
    }

    @Test
    void elHiloQueEjecutaLaTareaRecuperaSuMdcAnterior() {
        MDC.put("correlationId", "origen-1");
        Runnable decorada = new MdcTaskDecorator().decorate(() -> { });

        MDC.put("correlationId", "hilo-del-pool");
        decorada.run();

        assertEquals("hilo-del-pool", MDC.get("correlationId"));
    }

    @Test
    void sinMdcOrigenLaTareaNoHeredaContextoAjeno() {
        Runnable decorada = new MdcTaskDecorator().decorate(() -> assertNull(MDC.get("correlationId")));

        MDC.put("correlationId", "residuo");
        decorada.run();

        assertEquals("residuo", MDC.get("correlationId"));
    }
}
