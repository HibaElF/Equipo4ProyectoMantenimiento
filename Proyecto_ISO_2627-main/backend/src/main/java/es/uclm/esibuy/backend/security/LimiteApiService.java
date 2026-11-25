package es.uclm.esibuy.backend.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

// Límite general de peticiones de la API con ventana deslizante, en memoria (mismo patrón que
// LimiteSolicitudesRecuperacion). Es por instancia: con varias réplicas el límite efectivo se
// multiplica, y se reinicia al reiniciar el servidor. Se usa en memoria para no escribir en MongoDB
// en cada petición; lo sensible y de poco volumen (login, OTP) tiene su propio límite persistente.
public class LimiteApiService {

	private static final int ENTRADAS_ANTES_DE_LIMPIAR = 10_000;

	public record Resultado(boolean permitida, int retryAfterSegundos) {
	}

	private final int maximoPeticiones;
	private final Duration ventana;
	private final Clock reloj;
	private final Map<String, Deque<Instant>> peticionesPorClave = new HashMap<>();

	public LimiteApiService(int maximoPeticiones, Duration ventana, Clock reloj) {
		if (maximoPeticiones < 1 || ventana.isZero() || ventana.isNegative()) {
			throw new IllegalArgumentException("El límite de peticiones y su ventana deben ser positivos.");
		}
		this.maximoPeticiones = maximoPeticiones;
		this.ventana = ventana;
		this.reloj = reloj;
	}

	// Anota la petición si cabe en el límite. Las rechazadas no cuentan, para no alargar el bloqueo.
	public synchronized Resultado registrar(String clave) {
		Instant ahora = reloj.instant();
		Instant limite = ahora.minus(ventana);
		limpiarSiCrece(limite);

		Deque<Instant> recientes = peticionesPorClave.computeIfAbsent(clave, c -> new ArrayDeque<>());
		while (!recientes.isEmpty() && !recientes.peekFirst().isAfter(limite)) {
			recientes.pollFirst();
		}
		if (recientes.size() >= maximoPeticiones) {
			long espera = Duration.between(ahora, recientes.peekFirst().plus(ventana)).toMillis();
			return new Resultado(false, (int) Math.max(1, (espera + 999) / 1000));
		}
		recientes.addLast(ahora);
		return new Resultado(true, 0);
	}

	private void limpiarSiCrece(Instant limite) {
		if (peticionesPorClave.size() < ENTRADAS_ANTES_DE_LIMPIAR) {
			return;
		}
		peticionesPorClave.values().removeIf(cola -> cola.isEmpty() || !cola.peekLast().isAfter(limite));
	}
}
