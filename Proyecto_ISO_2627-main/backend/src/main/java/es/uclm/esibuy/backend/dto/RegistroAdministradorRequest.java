package es.uclm.esibuy.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import es.uclm.esibuy.backend.validation.ImagenPerfilHttps;
import es.uclm.esibuy.backend.validation.PatronesEntrada;

public record RegistroAdministradorRequest(
		@NotBlank @Size(max = PatronesEntrada.MAX_NOMBRE) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String nombre,
		@NotBlank @Size(max = PatronesEntrada.MAX_APELLIDOS) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String apellidos,
		@NotBlank @Email @Size(max = PatronesEntrada.MAX_EMAIL) String email,
		@NotBlank @Size(max = PatronesEntrada.MAX_CONTRASENA) String contrasena,
		@Size(max = PatronesEntrada.MAX_SEDE) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String sede,
		LocalDate fechaIncorporacion,
		@ImagenPerfilHttps String imagenPerfil) {

	public RegistroAdministradorRequest {
		if (email != null) {
			email = email.trim();
		}
	}
}
