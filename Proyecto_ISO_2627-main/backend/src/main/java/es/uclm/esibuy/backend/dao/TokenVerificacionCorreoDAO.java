package es.uclm.esibuy.backend.dao;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;

import es.uclm.esibuy.backend.model.TokenVerificacionCorreo;

public interface TokenVerificacionCorreoDAO
        extends MongoRepository<TokenVerificacionCorreo, String> {

    Optional<TokenVerificacionCorreo> findByHashToken(String hashToken);

    // Consumo atómico: solo un intento puede usar el enlace, y solo antes de que caduque.
    @Query("{ '_id': ?0, 'consumido': false, 'caducidad': { '$gt': ?1 } }")
    @Update("{ '$set': { 'consumido': true } }")
    long consumirSiValido(String id, Instant ahora);
}
