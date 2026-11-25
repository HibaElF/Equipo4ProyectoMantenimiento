
package es.uclm.esibuy.backend.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

class UsuarioModelTests {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void customerHasRequiredFieldsAndDniNifLengthConstraint() {
        Cliente cliente = new Cliente();

        Set<String> violatedFields = validator.validate(cliente).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(Collectors.toSet());

        assertTrue(violatedFields.containsAll(Set.of(
                "nombre",
                "apellidos",
                "email",
                "contrasenaHash",
                "fechaNacimiento",
                "dniNif")));

        cliente.setDniNif("1234567890");

        assertTrue(validator.validateProperty(cliente, "dniNif").stream()
                .anyMatch(violation ->
                        violation.getConstraintDescriptor().getAnnotation() instanceof Size));
    }

    @Test
    void sellerRequiredFieldsAreDeclaredOnModel() throws NoSuchFieldException {
        assertConstraint(Vendedor.class.getDeclaredField("categoriaId"), NotBlank.class);
        assertConstraint(Vendedor.class.getDeclaredField("dniNif"), NotBlank.class);
        assertConstraint(Vendedor.class.getDeclaredField("dniNif"), Size.class);
        assertConstraint(Vendedor.class.getDeclaredField("nombreComercial"), NotBlank.class);
    }

    @Test
    void laFechaDelUltimoCambioSeActualizaAlRegistrarUnaContrasenaPeroNoAlReCifrarla() {
        Cliente cliente = new Cliente();
        assertEquals(null, cliente.getContrasenaCambiadaEn());

        java.time.Instant antes = java.time.Instant.now();
        cliente.registrarContrasenaHash("hash-1");
        java.time.Instant fecha = cliente.getContrasenaCambiadaEn();

        assertTrue(!fecha.isBefore(antes) && !fecha.isAfter(java.time.Instant.now()));

        cliente.actualizarContrasenaHash("hash-1-recifrado");
        assertEquals(fecha, cliente.getContrasenaCambiadaEn());

        cliente.setContrasenaCambiadaEn(java.time.Instant.EPOCH);
        cliente.registrarContrasenaHash("hash-2");
        assertTrue(cliente.getContrasenaCambiadaEn().isAfter(java.time.Instant.EPOCH));
    }

    @Test
    void emailIsTrimmedAndLowercased() {
        Cliente cliente = new Cliente();

        cliente.setEmail("  Ana@Example.COM  ");

        assertEquals("ana@example.com", cliente.getEmail());
    }

    @Test
    void customerAndSellerShareCollectionAndUniqueIndexesAreDeclared() throws NoSuchFieldException {
        assertEquals("usuarios", Cliente.class.getAnnotation(Document.class).collection());
        assertEquals("usuarios", Vendedor.class.getAnnotation(Document.class).collection());

        Indexed emailIndex = Usuario.class.getDeclaredField("email")
                .getAnnotation(Indexed.class);

        assertTrue(emailIndex.unique());

        Indexed commercialNameIndex = Vendedor.class.getDeclaredField("nombreComercial")
                .getAnnotation(Indexed.class);

        assertTrue(commercialNameIndex.unique());
        assertTrue(commercialNameIndex.sparse());
    }

    @Test
    void customerBirthDateIsRequiredAndPremiumFlagDefaultsToNormal() throws NoSuchFieldException {
        assertConstraint(Cliente.class.getDeclaredField("fechaNacimiento"), NotNull.class);
        assertTrue(!new Cliente().isEsPremium());
    }

    private static void assertConstraint(
            Field field,
            Class<? extends java.lang.annotation.Annotation> constraint) {

        assertTrue(
                field.isAnnotationPresent(constraint),
                () -> field.getName() + " should have " + constraint.getSimpleName());
    }
}
