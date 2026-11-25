package es.uclm.esibuy.backend.dao;

import java.util.Collection;
import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import es.uclm.esibuy.backend.model.ListaProductos;

public interface ListaProductosDAO
        extends MongoRepository<ListaProductos, String> {

    List<ListaProductos> findByUsuarioId(String usuarioId);

    void deleteByUsuarioId(String usuarioId);

    long countByUsuarioId(String usuarioId);

    // Listas de favoritos (las predeterminadas) que contienen el producto.
    @Query("{ 'predeterminada': true, 'productos': ?0 }")
    List<ListaProductos> findFavoritosConProducto(String productoId);

    @Query("{ 'productos': { '$in': ?0 } }")
    List<ListaProductos> findConAlgunProducto(Collection<String> productoIds);
}
