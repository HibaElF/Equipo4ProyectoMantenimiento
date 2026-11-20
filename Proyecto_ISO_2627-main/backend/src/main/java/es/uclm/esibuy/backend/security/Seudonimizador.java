package es.uclm.esibuy.backend.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// Identificador estable y no reversible (HMAC-SHA256 con el pepper) para referirse a un usuario
// en logs y auditoría sin exponer su correo.
public class Seudonimizador {

	private static final String ALGORITMO = "HmacSHA256";
	private static final int LONGITUD_IDENTIFICADOR = 16;

	private final byte[] clave;

	public Seudonimizador(String pepper) {
		if (pepper == null || pepper.isBlank()) {
			throw new IllegalArgumentException("La seudonimización necesita el pepper de seguridad.");
		}
		this.clave = pepper.getBytes(StandardCharsets.UTF_8);
	}

	public String seudonimizar(String valor) {
		if (valor == null || valor.isBlank()) {
			return "anonimo";
		}
		try {
			Mac mac = Mac.getInstance(ALGORITMO);
			mac.init(new SecretKeySpec(clave, ALGORITMO));
			String hash = HexFormat.of().formatHex(mac.doFinal(valor.getBytes(StandardCharsets.UTF_8)));
			return hash.substring(0, LONGITUD_IDENTIFICADOR);
		} catch (GeneralSecurityException exception) {
			throw new IllegalStateException("No se pudo seudonimizar el valor.", exception);
		}
	}
}
