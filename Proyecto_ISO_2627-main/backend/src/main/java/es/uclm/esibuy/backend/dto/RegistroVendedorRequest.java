package es.uclm.esibuy.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import es.uclm.esibuy.backend.validation.ImagenPerfilHttps;
import es.uclm.esibuy.backend.validation.PatronesEntrada;

public record RegistroVendedorRequest(
		@NotBlank @Size(max = PatronesEntrada.MAX_NOMBRE) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String nombre,
		@NotBlank @Size(max = PatronesEntrada.MAX_APELLIDOS) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String apellidos,
		@NotBlank @Size(min = 9, max = 9, message = "El DNI/NIF debe tener 9 caracteres.") @Pattern(regexp = "^[0-9]{8}[A-Za-z]$", message = "El DNI/NIF debe tener 8 números y una letra.") String dniNif,
		@NotBlank @Email @Size(max = PatronesEntrada.MAX_EMAIL) String email,
		@NotBlank @Size(max = PatronesEntrada.MAX_CONTRASENA) String contrasena,
		@NotBlank String categoriaId,
		@NotBlank @Size(max = PatronesEntrada.MAX_NOMBRE_COMERCIAL) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String nombreComercial,
		@Pattern(regexp = PatronesEntrada.TELEFONO, message = PatronesEntrada.MENSAJE_TELEFONO) @Size(max = 20) String telefono,
		@ImagenPerfilHttps String imagenPerfil) {

	public RegistroVendedorRequest {
		if (email != null) {
			email = email.trim();
		}
	}
}