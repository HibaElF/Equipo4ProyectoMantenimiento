package es.uclm.esibuy.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import es.uclm.esibuy.backend.validation.Adult;
import es.uclm.esibuy.backend.validation.ImagenPerfilHttps;
import es.uclm.esibuy.backend.validation.PatronesEntrada;

public record RegistroClienteRequest(
		@NotBlank @Size(max = PatronesEntrada.MAX_NOMBRE) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String nombre,
		@NotBlank @Size(max = PatronesEntrada.MAX_APELLIDOS) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String apellidos,
		@NotNull @Adult LocalDate fechaNacimiento,
		@NotBlank @Size(min = 9, max = 9, message = "El DNI/NIF debe tener 9 caracteres.") @Pattern(regexp = "^[0-9]{8}[A-Za-z]$", message = "El DNI/NIF debe tener 8 números y una letra.") String dniNif,
		@NotBlank @Email @Size(max = PatronesEntrada.MAX_EMAIL) String email,
		@NotBlank @Size(max = PatronesEntrada.MAX_CONTRASENA) String contrasena,
		@Pattern(regexp = PatronesEntrada.TELEFONO, message = PatronesEntrada.MENSAJE_TELEFONO) @Size(max = 20) String telefono,
		@ImagenPerfilHttps String imagenPerfil,
		boolean esPremium,
		@NotNull(message = "Debes aceptar la política de privacidad.") @AssertTrue(message = "Debes aceptar la política de privacidad.") Boolean aceptaPolitica) {

	public RegistroClienteRequest {
		if (email != null) {
			email = email.trim();
		}
	}
}