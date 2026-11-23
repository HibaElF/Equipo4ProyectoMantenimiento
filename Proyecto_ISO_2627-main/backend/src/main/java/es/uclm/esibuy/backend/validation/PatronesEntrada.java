package es.uclm.esibuy.backend.validation;

// Reglas de formato compartidas por los DTO de alta y de acceso. No se restringen los caracteres de los
// nombres (hay apellidos con apóstrofos y tildes): solo se rechazan los caracteres de control.
public final class PatronesEntrada {

	public static final String SIN_CARACTERES_DE_CONTROL = "^[^\\p{Cntrl}]*$";
	public static final String MENSAJE_SIN_CARACTERES_DE_CONTROL = "No puede contener caracteres de control.";

	// Teléfono opcional: vacío o entre 7 y 20 caracteres (dígitos, espacios, paréntesis, puntos y guiones).
	// Solo el espacio normal: \\s admitiría también saltos de línea y tabuladores.
	public static final String TELEFONO = "^(\\+?[0-9 ().-]{7,20})?$";
	public static final String MENSAJE_TELEFONO = "Introduce un teléfono válido o deja el campo vacío.";

	public static final int MAX_NOMBRE = 100;
	public static final int MAX_APELLIDOS = 150;
	public static final int MAX_NOMBRE_COMERCIAL = 100;
	public static final int MAX_SEDE = 150;
	public static final int MAX_EMAIL = 254;
	public static final int MAX_CONTRASENA = 128;
	public static final int MAX_IMAGEN_PERFIL = 1000;

	private PatronesEntrada() {
	}
}
