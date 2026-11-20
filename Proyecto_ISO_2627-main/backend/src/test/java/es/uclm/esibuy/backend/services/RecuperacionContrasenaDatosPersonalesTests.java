package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.MongoTransactionManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.SimpleTransactionStatus;

import es.uclm.esibuy.backend.dao.TokenRecuperacionDAO;
import es.uclm.esibuy.backend.dao.UsuarioDAO;
import es.uclm.esibuy.backend.exceptions.InvalidRegistrationException;
import es.uclm.esibuy.backend.model.Administrador;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.TokenRecuperacion;
import es.uclm.esibuy.backend.model.Usuario;
import es.uclm.esibuy.backend.model.Vendedor;

// Usa la política de contraseñas real para comprobar que restablecer la contraseña
// aplica las mismas reglas de datos personales que el registro.
@ExtendWith(MockitoExtension.class)
class RecuperacionContrasenaDatosPersonalesTests {

    private static final String TOKEN = "token-valido-para-recuperacion";
    private static final String CONTRASENA_VALIDA = "Rt#NubeBlanca4";

    @Mock
    private UsuarioDAO usuarioDAO;
    @Mock
    private TokenRecuperacionDAO tokenDAO;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private SesionService sesionService;
    @Mock
    private BrevoEmailService brevoEmailService;
    @Mock
    private LimiteSolicitudesRecuperacion limiteSolicitudes;
    @Mock
    private AuditoriaService auditoriaService;
    @Mock
    private MongoTransactionManager transactionManager;

    private RecuperacionContrasenaService servicio;

    @BeforeEach
    void setUp() {
        servicio = new RecuperacionContrasenaService(
                usuarioDAO,
                tokenDAO,
                passwordEncoder,
                new PasswordPolicy(),
                sesionService,
                brevoEmailService,
                limiteSolicitudes,
                auditoriaService,
                transactionManager,
                "https://esibuy.example/");
        lenient().when(transactionManager.getTransaction(any()))
                .thenReturn(new SimpleTransactionStatus());
    }

    static Stream<Arguments> contrasenasConDatosPersonales() {
        return Stream.of(
                Arguments.of("cliente: nombre", cliente(), "Zq!marcelo92"),
                Arguments.of("cliente: apellidos", cliente(), "Zq!quintanilla9"),
                Arguments.of("cliente: parte del correo", cliente(), "Zq!vidal7Ab"),
                Arguments.of("cliente: teléfono", cliente(), "Zq!612345678x"),
                Arguments.of("cliente: DNI", cliente(), "Zq!12345678Zk"),
                Arguments.of("cliente: fecha de nacimiento", cliente(), "Zq!17052000k"),
                Arguments.of("vendedor: nombre", vendedor(), "Zq!rosario92"),
                Arguments.of("vendedor: apellidos", vendedor(), "Zq!castellanos9"),
                Arguments.of("vendedor: parte del correo", vendedor(), "Zq!lupita7Ab"),
                Arguments.of("vendedor: nombre comercial", vendedor(), "Zq!juguetes7A"),
                Arguments.of("vendedor: teléfono", vendedor(), "Zq!699887766x"),
                Arguments.of("vendedor: DNI", vendedor(), "Zq!87654321Xk"),
                Arguments.of("administrador: nombre", administrador(), "Zq!octavio92"),
                Arguments.of("administrador: apellidos", administrador(), "Zq!villanueva9"),
                Arguments.of("administrador: parte del correo", administrador(), "Zq!gestor7Ab"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("contrasenasConDatosPersonales")
    void rechazaContrasenasConDatosPersonalesSinConsumirElToken(
            String caso, Usuario usuario, String contrasena) {
        TokenRecuperacion tokenGuardado = tokenValido(usuario);
        when(tokenDAO.findByHashToken(hash(TOKEN))).thenReturn(Optional.of(tokenGuardado));
        when(usuarioDAO.findById("usuario-1")).thenReturn(Optional.of(usuario));

        assertThrows(InvalidRegistrationException.class,
                () -> servicio.completar(TOKEN, contrasena));

        verify(tokenDAO, never()).consumirSiValido(anyString(), any(Instant.class));
        verify(usuarioDAO, never()).save(any(Usuario.class));
        verifyNoInteractions(sesionService, auditoriaService);
    }

    static Stream<Arguments> usuarios() {
        return Stream.of(
                Arguments.of("cliente", cliente()),
                Arguments.of("vendedor", vendedor()),
                Arguments.of("administrador", administrador()));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("usuarios")
    void unaContrasenaSinDatosPersonalesSigueFuncionando(String tipo, Usuario usuario) {
        TokenRecuperacion tokenGuardado = tokenValido(usuario);
        when(tokenDAO.findByHashToken(hash(TOKEN))).thenReturn(Optional.of(tokenGuardado));
        when(usuarioDAO.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.encode(CONTRASENA_VALIDA)).thenReturn("hash-nuevo");
        when(tokenDAO.consumirSiValido(eq("token-doc-1"), any(Instant.class))).thenReturn(1L);

        servicio.completar(TOKEN, CONTRASENA_VALIDA);

        verify(usuarioDAO).save(usuario);
        assertEquals("hash-nuevo", usuario.getContrasenaHash());
        verify(sesionService).cerrarSesiones(usuario.getEmail());
    }

    @Test
    void datosPersonalesDeClienteIncluyeLaFechaConElFormatoDelRegistro() {
        List<String> datos = PasswordPolicy.datosPersonalesDe(cliente());

        assertEquals(List.of("Marcelo", "Quintanilla", "elena.vidal@example.com",
                "612345678", "17052000", "12345678Z"), datos);
    }

    @Test
    void datosPersonalesDeVendedorIncluyeElNombreComercialYElDni() {
        List<String> datos = PasswordPolicy.datosPersonalesDe(vendedor());

        assertEquals(List.of("Rosario", "Castellanos", "lupita@example.com",
                "699887766", "Juguetes Lupita", "87654321X"), datos);
    }

    @Test
    void datosPersonalesDeAdministradorSoloIncluyeNombreApellidosYCorreo() {
        assertEquals(List.of("Octavio", "Villanueva", "gestor@example.com"),
                PasswordPolicy.datosPersonalesDe(administrador()));
    }

    @Test
    void datosPersonalesDeOmiteValoresNulosOVacios() {
        Cliente cliente = new Cliente();
        cliente.setNombre("Marcelo");
        cliente.setApellidos("  ");
        cliente.setTelefono(null);

        assertEquals(List.of("Marcelo"), PasswordPolicy.datosPersonalesDe(cliente));
        assertTrue(PasswordPolicy.datosPersonalesDe(null).isEmpty());
    }

    private static Cliente cliente() {
        Cliente cliente = new Cliente();
        cliente.setNombre("Marcelo");
        cliente.setApellidos("Quintanilla");
        cliente.setEmail("elena.vidal@example.com");
        cliente.setTelefono("612345678");
        cliente.setFechaNacimiento(LocalDate.of(2000, 5, 17));
        cliente.setDniNif("12345678Z");
        return cliente;
    }

    private static Vendedor vendedor() {
        Vendedor vendedor = new Vendedor();
        vendedor.setNombre("Rosario");
        vendedor.setApellidos("Castellanos");
        vendedor.setEmail("lupita@example.com");
        vendedor.setTelefono("699887766");
        vendedor.setNombreComercial("Juguetes Lupita");
        vendedor.setDniNif("87654321X");
        return vendedor;
    }

    private static Administrador administrador() {
        Administrador administrador = new Administrador();
        administrador.setNombre("Octavio");
        administrador.setApellidos("Villanueva");
        administrador.setEmail("gestor@example.com");
        return administrador;
    }

    private static TokenRecuperacion tokenValido(Usuario usuario) {
        usuario.setId("usuario-1");
        TokenRecuperacion token = new TokenRecuperacion(
                hash(TOKEN), "usuario-1", Instant.now().plusSeconds(30 * 60));
        ReflectionTestUtils.setField(token, "id", "token-doc-1");
        return token;
    }

    private static String hash(String valor) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(valor.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new AssertionError(exception);
        }
    }
}
