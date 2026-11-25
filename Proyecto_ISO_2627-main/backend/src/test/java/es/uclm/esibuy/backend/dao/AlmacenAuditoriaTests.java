package es.uclm.esibuy.backend.dao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.repository.MongoRepository;

import es.uclm.esibuy.backend.model.EventoAuditoria;

class AlmacenAuditoriaTests {

    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final AlmacenAuditoria almacen = new AlmacenAuditoria(mongoTemplate);

    @Test
    void insertaElEventoSinModificarlo() {
        EventoAuditoria evento = new EventoAuditoria(
                Instant.now(), "login_correcto", "exito", "actor", "u1", "203.0.113.9", "abc12345", Map.of());

        almacen.insertar(evento);

        verify(mongoTemplate).insert(evento);
    }

    @Test
    void consultaPaginadaOrdenadaPorFechaDescendente() {
        when(mongoTemplate.find(any(Query.class), eq(EventoAuditoria.class))).thenReturn(List.of());

        almacen.consultar(2, 20);

        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).find(captor.capture(), eq(EventoAuditoria.class));
        assertEquals(40, captor.getValue().getSkip());
        assertEquals(20, captor.getValue().getLimit());
        assertTrue(captor.getValue().getSortObject().toJson().contains("\"fecha\": -1"));
    }

    @Test
    void elAlmacenNoOfreceActualizarNiBorrarRegistros() {
        assertFalse(MongoRepository.class.isAssignableFrom(AlmacenAuditoria.class));
        for (Method metodo : AlmacenAuditoria.class.getDeclaredMethods()) {
            String nombre = metodo.getName().toLowerCase();
            assertFalse(nombre.contains("borrar") || nombre.contains("delete") || nombre.contains("remove")
                    || nombre.contains("eliminar") || nombre.contains("update") || nombre.contains("actualizar")
                    || nombre.contains("save"), "Método no permitido: " + metodo.getName());
        }
    }

    @Test
    void lasColeccionesTienenUnIndiceTtlParaLaRetencion() throws Exception {
        Indexed indice = EventoAuditoria.class.getDeclaredField("fecha").getAnnotation(Indexed.class);

        assertEquals("${app.auditoria.retencion:365d}", indice.expireAfter());
    }
}
