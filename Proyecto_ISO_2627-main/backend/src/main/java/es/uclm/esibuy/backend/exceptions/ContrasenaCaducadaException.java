package es.uclm.esibuy.backend.exceptions;

// La contraseña es correcta pero ha superado su vida máxima: hay que renovarla (recuperación por correo).
public class ContrasenaCaducadaException extends RuntimeException {
	private static final long serialVersionUID = 1L;

	// Código estable que el frontend reconoce para mostrar el aviso y el enlace de recuperación.
	public static final String CODIGO = "CONTRASENA_CADUCADA";

	public ContrasenaCaducadaException() {
		super("Tu contraseña ha caducado. Restablécela desde «He olvidado mi contraseña».");
	}
}
