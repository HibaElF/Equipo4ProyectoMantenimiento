package es.uclm.esibuy.backend.dao;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import es.uclm.esibuy.backend.model.EventoAuditoria;

// Almacén de solo inserción y consulta: a propósito no ofrece actualizar ni borrar, y no extiende
// MongoRepository (que sí expone el borrado). La retención la aplica el índice TTL de la colección.
@Repository
public class AlmacenAuditoria {

	private final MongoTemplate mongoTemplate;

	public AlmacenAuditoria(MongoTemplate mongoTemplate) {
		this.mongoTemplate = mongoTemplate;
	}

	public void insertar(EventoAuditoria evento) {
		mongoTemplate.insert(evento);
	}

	public List<EventoAuditoria> consultar(int pagina, int tamano) {
		Query consulta = new Query()
				.with(PageRequest.of(pagina, tamano, Sort.by(Sort.Direction.DESC, "fecha")));
		return mongoTemplate.find(consulta, EventoAuditoria.class);
	}

	public long contar() {
		return mongoTemplate.count(new Query(), EventoAuditoria.class);
	}
}
