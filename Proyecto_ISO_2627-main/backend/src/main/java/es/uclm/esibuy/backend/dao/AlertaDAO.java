package es.uclm.esibuy.backend.dao;

import org.springframework.data.mongodb.repository.MongoRepository;

import es.uclm.esibuy.backend.model.Alerta;

public interface AlertaDAO extends MongoRepository<Alerta, String> {
}
