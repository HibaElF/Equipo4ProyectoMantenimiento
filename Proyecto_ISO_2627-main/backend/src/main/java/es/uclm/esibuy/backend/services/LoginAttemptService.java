package es.uclm.esibuy.backend.services;

import java.time.Instant;
import java.util.Locale;

import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.LoginAttemptStore;
import es.uclm.esibuy.backend.dao.ResultadoFalloLogin;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;

@Service
public class LoginAttemptService {
    private final LoginAttemptStore store;

    public LoginAttemptService(LoginAttemptStore store) {
        this.store = store;
    }

    public void reservarIntento(String ip, String email) {
        int retryAfter = store.reservarIntento(ip, normalizar(email), Instant.now());
        if (retryAfter > 0) {
            throw new LoginRateLimitException(retryAfter);
        }
    }

    public int registrarFallo(String email) {
        return store.registrarFallo(normalizar(email), Instant.now());
    }

    // Igual que registrarFallo, pero indica si este fallo ha creado el bloqueo de la cuenta.
    public ResultadoFalloLogin registrarFalloDetallado(String email) {
        return store.registrarFalloDetallado(normalizar(email), Instant.now());
    }

    // true si se puede avisar al titular (como máximo un aviso por hora y cuenta).
    public boolean permitirAvisoBloqueo(String email) {
        return store.reservarAvisoBloqueo(normalizar(email), Instant.now());
    }

    public void registrarExito(String email) {
        store.registrarExito(normalizar(email), Instant.now());
    }

    private static String normalizar(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}