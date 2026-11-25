package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import es.uclm.esibuy.backend.dao.CategoriaDAO;
import es.uclm.esibuy.backend.dao.ClienteDAO;
import es.uclm.esibuy.backend.dto.CategoriaFavoritaResponse;
import es.uclm.esibuy.backend.exceptions.CategoriaNoEncontradaException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Categoria;
import es.uclm.esibuy.backend.model.Cliente;

@ExtendWith(MockitoExtension.class)
class CategoriaFavoritaServiceTests {

    private static final String CORREO = "cliente@test.com";

    @Mock
    private ClienteDAO clienteDAO;

    @Mock
    private CategoriaDAO categoriaDAO;

    @InjectMocks
    private CategoriaFavoritaService categoriaFavoritaService;

    private Cliente cliente;

    @BeforeEach
    void preparar() {
        cliente = new Cliente();
        cliente.setId("cliente-1");
        cliente.setEmail(CORREO);
    }

    private Categoria categoria(String id, String nombre) {
        Categoria categoria = new Categoria(nombre, "Descripción de " + nombre);
        categoria.setId(id);
        return categoria;
    }

    private void prepararCliente() {
        when(clienteDAO.findByEmail(CORREO)).thenReturn(Optional.of(cliente));
    }

    @Test
    void consultarSinFavoritasDevuelveListaVacia() {
        prepararCliente();

        assertTrue(categoriaFavoritaService.consultar(CORREO).isEmpty());
        verifyNoInteractions(categoriaDAO);
    }

    @Test
    void consultarNormalizaElCorreoAutenticado() {
        prepararCliente();

        categoriaFavoritaService.consultar("  Cliente@Test.com ");

        verify(clienteDAO).findByEmail(CORREO);
    }

    @Test
    void anadirGuardaLaCategoriaPorIdYDevuelveSuNombre() {
        prepararCliente();
        Categoria electronica = categoria("cat-1", "Electrónica");
        when(categoriaDAO.findById("cat-1")).thenReturn(Optional.of(electronica));
        when(categoriaDAO.findAllById(List.of("cat-1"))).thenReturn(List.of(electronica));

        List<CategoriaFavoritaResponse> respuesta =
                categoriaFavoritaService.anadir(CORREO, "cat-1");

        assertEquals(List.of(new CategoriaFavoritaResponse("cat-1", "Electrónica")), respuesta);
        assertEquals(List.of("cat-1"), cliente.getCategoriasFavoritas());
        verify(clienteDAO).save(cliente);
    }

    @Test
    void anadirUnaCategoriaYaFavoritaNoLaDuplicaNiGuarda() {
        cliente.agregarCategoriaFavorita("cat-1");
        prepararCliente();
        Categoria electronica = categoria("cat-1", "Electrónica");
        when(categoriaDAO.findById("cat-1")).thenReturn(Optional.of(electronica));
        when(categoriaDAO.findAllById(List.of("cat-1"))).thenReturn(List.of(electronica));

        List<CategoriaFavoritaResponse> respuesta =
                categoriaFavoritaService.anadir(CORREO, "cat-1");

        assertEquals(1, respuesta.size());
        assertEquals(List.of("cat-1"), cliente.getCategoriasFavoritas());
        verify(clienteDAO, never()).save(any());
    }

    @Test
    void anadirCategoriaInexistenteLanzaExcepcion() {
        when(categoriaDAO.findById("no-existe")).thenReturn(Optional.empty());

        assertThrows(CategoriaNoEncontradaException.class,
                () -> categoriaFavoritaService.anadir(CORREO, "no-existe"));

        verify(clienteDAO, never()).save(any());
    }

    @Test
    void anadirConIdVacioLanzaExcepcion() {
        assertThrows(IllegalArgumentException.class,
                () -> categoriaFavoritaService.anadir(CORREO, " "));

        verifyNoInteractions(clienteDAO, categoriaDAO);
    }

    @Test
    void quitarEliminaLaCategoriaYGuarda() {
        cliente.agregarCategoriaFavorita("cat-1");
        cliente.agregarCategoriaFavorita("cat-2");
        prepararCliente();
        Categoria hogar = categoria("cat-2", "Hogar");
        when(categoriaDAO.findAllById(List.of("cat-2"))).thenReturn(List.of(hogar));

        List<CategoriaFavoritaResponse> respuesta =
                categoriaFavoritaService.quitar(CORREO, "cat-1");

        assertEquals(List.of(new CategoriaFavoritaResponse("cat-2", "Hogar")), respuesta);
        assertEquals(List.of("cat-2"), cliente.getCategoriasFavoritas());
        verify(clienteDAO).save(cliente);
    }

    @Test
    void quitarUnaCategoriaQueNoEraFavoritaNoGuarda() {
        prepararCliente();

        assertTrue(categoriaFavoritaService.quitar(CORREO, "cat-1").isEmpty());

        verify(clienteDAO, never()).save(any());
    }

    @Test
    void consultarOmiteCategoriasEliminadasYRespetaElOrden() {
        cliente.agregarCategoriaFavorita("cat-2");
        cliente.agregarCategoriaFavorita("cat-borrada");
        cliente.agregarCategoriaFavorita("cat-1");
        prepararCliente();
        when(categoriaDAO.findAllById(List.of("cat-2", "cat-borrada", "cat-1")))
                .thenReturn(List.of(categoria("cat-1", "Electrónica"), categoria("cat-2", "Hogar")));

        List<CategoriaFavoritaResponse> respuesta = categoriaFavoritaService.consultar(CORREO);

        assertEquals(List.of(
                new CategoriaFavoritaResponse("cat-2", "Hogar"),
                new CategoriaFavoritaResponse("cat-1", "Electrónica")), respuesta);
    }

    @Test
    void usuarioQueNoEsClienteLanzaExcepcion() {
        when(clienteDAO.findByEmail(CORREO)).thenReturn(Optional.empty());

        assertThrows(UsuarioNoEncontradoException.class,
                () -> categoriaFavoritaService.consultar(CORREO));
    }
}
