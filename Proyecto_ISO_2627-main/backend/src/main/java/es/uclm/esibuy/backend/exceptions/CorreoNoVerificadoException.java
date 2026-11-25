package es.uclm.esibuy.backend.exceptions;

// Credenciales correctas, pero la cuenta nueva aún no ha confirmado la propiedad del correo.
public class CorreoNoVerificadoException extends RuntimeException {
	private static final long serialVersionUID = 1L;

	public CorreoNoVerificadoException() {
		super("Confirma tu correo electrónico con el enlace que te hemos enviado antes de iniciar sesión.");
	}
}
