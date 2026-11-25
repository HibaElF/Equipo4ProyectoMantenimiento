package es.uclm.esibuy.backend.exceptions;

// Datos de entrada rechazados con un mensaje pensado para el usuario: se devuelve tal cual al cliente.
// Cualquier otra IllegalArgumentException se considera un error interno y no expone su mensaje.
public class DatosNoValidosException extends IllegalArgumentException {

	public DatosNoValidosException(String mensaje) {
		super(mensaje);
	}

	public DatosNoValidosException(String mensaje, Throwable causa) {
		super(mensaje, causa);
	}
}
