package es.uclm.esibuy.backend.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;

class ConfiguracionLogsTests {

    // El sistema de logging es global a la JVM: se devuelve a texto plano para no alterar
    // las pruebas que leen la salida (por ejemplo AuditoriaServiceTests).
    @AfterEach
    void restaurarLogsEnTextoPlano() {
        new SpringApplicationBuilder(ConfiguracionMinima.class)
                .web(WebApplicationType.NONE)
                .properties("spring.main.banner-mode=off")
                // Como argumento, para que prevalezca sobre el valor de application.properties.
                .run("--logging.structured.format.console=")
                .close();
    }

    @Test
    void losLogsSeEmitenEnJsonPorConsolaConFormatoSobrescribible() throws IOException {
        Properties props = PropertiesLoaderUtils.loadProperties(new ClassPathResource("application.properties"));

        assertEquals("${LOG_FORMAT:ecs}", props.getProperty("logging.structured.format.console"));
        assertTrue(props.getProperty("logging.pattern.correlation").contains("%X{correlationId"));
    }

    // Arranca un contexto mínimo con la misma propiedad y comprueba la línea real que sale por consola.
    @Test
    void unaLineaDeLogPorConsolaEsJsonConElContexto() {
        PrintStream original = System.out;
        ByteArrayOutputStream captura = new ByteArrayOutputStream();
        System.setOut(new PrintStream(captura, true, StandardCharsets.UTF_8));
        try (ConfigurableApplicationContext contexto = new SpringApplicationBuilder(ConfiguracionMinima.class)
                .web(WebApplicationType.NONE)
                .properties("spring.main.banner-mode=off")
                // Como argumento, para que prevalezca sobre LOG_FORMAT, que las pruebas dejan vacío.
                .run("--logging.structured.format.console=ecs")) {
            Logger logger = LoggerFactory.getLogger("prueba.logs");
            MDC.put("correlationId", "abc12345-def6");
            MDC.put("usuario", "0123456789abcdef");
            MDC.put("ip", "203.0.113.9");
            MDC.put("endpoint", "/usuarios/login");
            MDC.put("userAgent", "Navegador/1.0");
            try {
                logger.error("fallo de prueba", new IllegalStateException("causa simulada"));
            } finally {
                MDC.clear();
            }
        } finally {
            System.setOut(original);
        }

        String salida = captura.toString(StandardCharsets.UTF_8);
        String linea = salida.lines().filter(l -> l.contains("fallo de prueba")).findFirst().orElse("");
        assertTrue(linea.startsWith("{") && linea.endsWith("}"), "La línea no es JSON: " + linea);
        assertTrue(linea.contains("\"@timestamp\""), linea);
        assertTrue(linea.contains("\"level\":\"ERROR\""), linea);
        assertTrue(linea.contains("\"error\":{\"type\":\"java.lang.IllegalStateException\""), linea);
        assertTrue(linea.contains("\"message\":\"fallo de prueba\""), linea);
        assertTrue(linea.contains("\"correlationId\":\"abc12345-def6\""), linea);
        assertTrue(linea.contains("\"usuario\":\"0123456789abcdef\""), linea);
        assertTrue(linea.contains("\"ip\":\"203.0.113.9\""), linea);
        assertTrue(linea.contains("\"endpoint\":\"/usuarios/login\""), linea);
        assertTrue(linea.contains("\"userAgent\":\"Navegador/1.0\""), linea);
        assertTrue(linea.contains("causa simulada"), linea);
    }

    @Configuration
    static class ConfiguracionMinima {
    }
}
