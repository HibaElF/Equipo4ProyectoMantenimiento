package es.uclm.esibuy.backend.dao;

// Resultado de registrar un fallo de login: segundos de espera (0 si no hay bloqueo) y si este
// fallo ha creado el bloqueo (true) o la cuenta ya estaba bloqueada (false).
public record ResultadoFalloLogin(int retryAfter, boolean nuevoBloqueo) {

	public static final ResultadoFalloLogin SIN_BLOQUEO = new ResultadoFalloLogin(0, false);
}
