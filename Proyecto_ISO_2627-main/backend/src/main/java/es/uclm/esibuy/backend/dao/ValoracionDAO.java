package es.uclm.esibuy.backend.dao;

import java.util.Collection;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import es.uclm.esibuy.backend.model.Valoracion;

public interface ValoracionDAO extends MongoRepository<Valoracion, String> {
    boolean existsByClienteIdAndProductoId(String clienteId, String productoId);

    List<Valoracion> findByProductoId(String productoId);

    // Estadísticas: valoraciones de un conjunto de productos (por ejemplo, el catálogo de un vendedor)
    List<Valoracion> findByProductoIdIn(Collection<String> productoIds);
}
