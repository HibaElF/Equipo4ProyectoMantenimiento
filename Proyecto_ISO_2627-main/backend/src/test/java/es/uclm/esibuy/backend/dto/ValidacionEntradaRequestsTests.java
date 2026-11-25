package es.uclm.esibuy.backend.dto;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

// Validación en servidor de los DTO de alta y de acceso (T-11): longitud y formato por campo.
class ValidacionEntradaRequestsTests {

    private static ValidatorFactory fabrica;
    private static Validator validador;

    @BeforeAll
    static void abrir() {
        fabrica = Validation.buildDefaultValidatorFactory();
        validador = fabrica.getValidator();
    }

    @AfterAll
    static void cerrar() {
        fabrica.close();
    }

    private static Set<String> camposInvalidos(Object peticion) {
        return validador.validate(peticion).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    private static RegistroClienteRequest cliente(String nombre, String apellidos, String email,
            String contrasena, String telefono, String imagen) {
        return new RegistroClienteRequest(nombre, apellidos, LocalDate.of(2000, 1, 1), "12345678Z",
                email, contrasena, telefono, imagen, false, true);
    }

    private static RegistroClienteRequest clienteValido() {
        return cliente("Ana", "García", "ana@example.com", "ClaveSegura9!", "+34 600 123 123",
                "https://cdn.example.com/ana.png");
    }

    private static RegistroVendedorRequest vendedor(String nombre, String comercial, String telefono, String imagen) {
        return new RegistroVendedorRequest(nombre, "López", "12345678Z", "luis@example.com",
                "ClaveSegura9!", "cat-1", comercial, telefono, imagen, true);
    }

    private static RegistroAdministradorRequest admin(String sede, String imagen) {
        return new RegistroAdministradorRequest("Ada", "Admin", "ada@example.com", "ClaveSegura9!",
                sede, null, imagen);
    }

    // T-24: sin aceptar la política de privacidad la petición no es válida.
    @Test
    void elRegistroExigeAceptarLaPoliticaDePrivacidad() {
        RegistroClienteRequest cliente = new RegistroClienteRequest("Ana", "García", LocalDate.of(2000, 1, 1),
                "12345678Z", "ana@example.com", "ClaveSegura9!", null, null, false, false);
        RegistroVendedorRequest vendedor = new RegistroVendedorRequest("Luis", "López", "12345678Z",
                "luis@example.com", "ClaveSegura9!", "cat-1", "UrbanStyle", null, null, false);

        assertEquals(Set.of("aceptaPolitica"), camposInvalidos(cliente));
        assertEquals(Set.of("aceptaPolitica"), camposInvalidos(vendedor));
    }

    @Test
    void unaPeticionCorrectaDeCadaTipoNoTieneErrores() {
        assertTrue(camposInvalidos(clienteValido()).isEmpty());
        assertTrue(camposInvalidos(vendedor("Luis", "UrbanStyle", "600123123", null)).isEmpty());
        assertTrue(camposInvalidos(admin("Madrid", "https://cdn.example.com/ada.png")).isEmpty());
        assertTrue(camposInvalidos(new LoginRequest("ana@example.com", "ClaveSegura9!")).isEmpty());
    }

    @Test
    void losNombresConApostrofosTildesYGuionesSiguenSiendoValidos() {
        assertTrue(camposInvalidos(cliente("Zoë-Ñandú", "O'Brien de la Peña", "ana@example.com",
                "ClaveSegura9!", null, null)).isEmpty());
    }

    @Test
    void nombreYApellidosTienenLongitudMaximaYNoAdmitenCaracteresDeControl() {
        assertEquals(Set.of("nombre"), camposInvalidos(cliente("a".repeat(101), "García", "ana@example.com",
                "ClaveSegura9!", null, null)));
        assertEquals(Set.of("apellidos"), camposInvalidos(cliente("Ana", "a".repeat(151), "ana@example.com",
                "ClaveSegura9!", null, null)));
        assertEquals(Set.of("nombre"), camposInvalidos(cliente("Ana\nGarcía", "García", "ana@example.com",
                "ClaveSegura9!", null, null)));
        assertEquals(Set.of("apellidos"), camposInvalidos(cliente("Ana", "García\u0000", "ana@example.com",
                "ClaveSegura9!", null, null)));
        assertTrue(camposInvalidos(cliente("a".repeat(100), "a".repeat(150), "ana@example.com",
                "ClaveSegura9!", null, null)).isEmpty());
    }

    @Test
    void elCorreoYLaContrasenaTienenLongitudMaxima() {
        String correoLargo = "a".repeat(250) + "@e.es";
        assertEquals(Set.of("email"), camposInvalidos(cliente("Ana", "García", correoLargo,
                "ClaveSegura9!", null, null)));
        assertEquals(Set.of("contrasena"), camposInvalidos(cliente("Ana", "García", "ana@example.com",
                "a".repeat(129), null, null)));
        assertTrue(camposInvalidos(cliente("Ana", "García", "ana@example.com",
                "a".repeat(128), null, null)).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = { "abc", "123", "6001231234567890123456", "600 123 12x", "<script>", "600\n123123" })
    void rechazaTelefonosConFormatoInvalido(String telefono) {
        assertEquals(Set.of("telefono"), camposInvalidos(cliente("Ana", "García", "ana@example.com",
                "ClaveSegura9!", telefono, null)));
        assertEquals(Set.of("telefono"), camposInvalidos(vendedor("Luis", "UrbanStyle", telefono, null)));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = { "600123123", "+34 600 123 123", "(91) 123.45.67", "+34-600-123-123" })
    void aceptaTelefonosValidosOVacios(String telefono) {
        assertTrue(camposInvalidos(cliente("Ana", "García", "ana@example.com",
                "ClaveSegura9!", telefono, null)).isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "perfil.png",
            "http://cdn.example.com/a.png",
            "ftp://cdn.example.com/a.png",
            "javascript:alert(1)",
            "data:image/png;base64,AAAA",
            "https:///sin-host.png",
            "https://usuario:clave@cdn.example.com/a.png",
            "https://cdn example.com/a.png" })
    void rechazaImagenesDePerfilQueNoSeanUnaUrlHttpsValida(String imagen) {
        assertEquals(Set.of("imagenPerfil"), camposInvalidos(cliente("Ana", "García", "ana@example.com",
                "ClaveSegura9!", null, imagen)));
        assertEquals(Set.of("imagenPerfil"), camposInvalidos(vendedor("Luis", "UrbanStyle", null, imagen)));
        assertEquals(Set.of("imagenPerfil"), camposInvalidos(admin(null, imagen)));
    }

    @Test
    void laImagenDePerfilTieneLongitudMaximaDeMilCaracteres() {
        String limite = "https://cdn.example.com/" + "a".repeat(1000 - "https://cdn.example.com/".length());
        assertEquals(1000, limite.length());
        assertTrue(camposInvalidos(admin(null, limite)).isEmpty());
        assertEquals(Set.of("imagenPerfil"), camposInvalidos(admin(null, limite + "a")));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = { "   " })
    void laImagenDePerfilEsOpcional(String imagen) {
        assertTrue(camposInvalidos(admin(null, imagen)).isEmpty());
    }

    @Test
    void elNombreComercialDelVendedorYLaSedeDelAdministradorTienenLongitudMaxima() {
        assertEquals(Set.of("nombreComercial"), camposInvalidos(vendedor("Luis", "a".repeat(101), null, null)));
        assertEquals(Set.of("nombreComercial"), camposInvalidos(vendedor("Luis", "Tienda\tX", null, null)));
        assertEquals(Set.of("sede"), camposInvalidos(admin("a".repeat(151), null)));
        assertTrue(camposInvalidos(admin("a".repeat(150), null)).isEmpty());
    }

    @Test
    void elVendedorYElAdministradorTambienLimitanNombreApellidosCorreoYContrasena() {
        assertEquals(Set.of("nombre"), camposInvalidos(vendedor("a".repeat(101), "UrbanStyle", null, null)));
        assertEquals(Set.of("nombre", "apellidos", "email", "contrasena"),
                camposInvalidos(new RegistroAdministradorRequest("a".repeat(101), "a".repeat(151),
                        "a".repeat(250) + "@e.es", "a".repeat(129), null, null, null)));
        assertEquals(Set.of("email", "contrasena"),
                camposInvalidos(new RegistroVendedorRequest("Luis", "López", "12345678Z",
                        "a".repeat(250) + "@e.es", "a".repeat(129), "cat-1", "UrbanStyle", null, null, true)));
    }

    @Test
    void elLoginRechazaContrasenasDeMasDeCientoVeintiochoCaracteresYCorreosDeMasDeDoscientosCincuentaYCuatro() {
        assertEquals(Set.of("password"), camposInvalidos(new LoginRequest("ana@example.com", "a".repeat(129))));
        assertEquals(Set.of("email"), camposInvalidos(new LoginRequest("a".repeat(250) + "@e.es", "ClaveSegura9!")));
        assertTrue(camposInvalidos(new LoginRequest("ana@example.com", "a".repeat(128))).isEmpty());
        assertEquals(Set.of("email", "password"), camposInvalidos(new LoginRequest("", "")));
    }
}
