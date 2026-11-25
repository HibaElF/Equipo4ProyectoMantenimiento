package es.uclm.esibuy.backend.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

// La imagen de perfil es opcional; si se indica debe ser una URL HTTPS válida de hasta 1000 caracteres.
@Documented
@Constraint(validatedBy = ImagenPerfilHttpsValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.ANNOTATION_TYPE, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
public @interface ImagenPerfilHttps {
	String message() default "La imagen de perfil debe utilizar una URL HTTPS válida.";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};
}
