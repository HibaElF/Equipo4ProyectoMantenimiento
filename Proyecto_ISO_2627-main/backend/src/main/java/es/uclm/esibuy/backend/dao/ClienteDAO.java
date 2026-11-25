package es.uclm.esibuy.backend.dao;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import es.uclm.esibuy.backend.model.Cliente;

public interface ClienteDAO extends MongoRepository<Cliente, String> {
	Optional<Cliente> findByEmail(String email);

	// Clientes que tienen alguna de esas categorías entre sus categorías favoritas.
	List<Cliente> findByCategoriasFavoritasIn(Collection<String> categoriaIds);
}
