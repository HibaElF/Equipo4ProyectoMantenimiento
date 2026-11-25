package es.uclm.esibuy.backend.dao;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import es.uclm.esibuy.backend.model.Categoria;

public interface CategoriaDAO extends MongoRepository<Categoria, String> {

        boolean existsByNombreIgnoreCase(String nombre);

        boolean existsByNombreIgnoreCaseAndIdNot(String nombre, String id);

        // Los productos guardan el nombre de la categoría; las categorías favoritas, su id.
        List<Categoria> findByNombreIgnoreCase(String nombre);
        
}