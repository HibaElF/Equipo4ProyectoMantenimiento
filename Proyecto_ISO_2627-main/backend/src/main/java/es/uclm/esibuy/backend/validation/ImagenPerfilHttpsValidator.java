package es.uclm.esibuy.backend.validation;

import java.net.URI;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class ImagenPerfilHttpsValidator implements ConstraintValidator<ImagenPerfilHttps, String> {

	@Override
	public boolean isValid(String imagenPerfil, ConstraintValidatorContext context) {
		return imagenPerfil == null || imagenPerfil.isBlank() || esUrlHttpsValida(imagenPerfil);
	}

	// Misma comprobación que usa la modificación del perfil: HTTPS, con host, sin credenciales en la URL.
	public static boolean esUrlHttpsValida(String valor) {
		String url = valor.trim();
		if (url.length() > PatronesEntrada.MAX_IMAGEN_PERFIL) {
			return false;
		}
		try {
			URI uri = URI.create(url);
			return "https".equalsIgnoreCase(uri.getScheme())
					&& uri.getHost() != null
					&& uri.getUserInfo() == null;
		} catch (IllegalArgumentException exception) {
			return false;
		}
	}
}
