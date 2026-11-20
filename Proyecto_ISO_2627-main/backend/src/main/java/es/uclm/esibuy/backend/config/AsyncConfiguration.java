package es.uclm.esibuy.backend.config;

import org.springframework.boot.task.ThreadPoolTaskExecutorCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

// Activa @Async con el executor que configura Spring Boot por defecto.
@Configuration
@EnableAsync
public class AsyncConfiguration {

    // Las tareas asíncronas heredan el contexto de log (correlationId, usuario…) de la petición.
    @Bean
    ThreadPoolTaskExecutorCustomizer contextoLogEnTareasAsincronas() {
        return executor -> executor.setTaskDecorator(new MdcTaskDecorator());
    }
}
