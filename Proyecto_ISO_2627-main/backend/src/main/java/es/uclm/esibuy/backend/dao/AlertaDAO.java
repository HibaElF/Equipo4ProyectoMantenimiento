package es.uclm.esibuy.backend.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import es.uclm.esibuy.backend.model.Alerta;

public interface AlertaDAO extends MongoRepository<Alerta, String> {

    List<Alerta> findByClienteIdOrderByFechaDesc(String clienteId);

    Optional<Alerta> findByIdAndClienteId(String id, String clienteId);

    long deleteByIdAndClienteId(String id, String clienteId);

    void deleteByClienteId(String clienteId);
}
