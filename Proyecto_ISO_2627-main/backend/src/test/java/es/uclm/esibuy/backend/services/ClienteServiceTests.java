package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import es.uclm.esibuy.backend.dao.ClienteDAO;
import es.uclm.esibuy.backend.dao.MetodoPagoDAO;
import es.uclm.esibuy.backend.exceptions.PagoPremiumException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.MetodoPago;

@ExtendWith(MockitoExtension.class)
class ClienteServiceTests {

    @Mock
    private ClienteDAO clienteDAO;

    @Mock
    private SoporteRegistro soporteRegistro;

    @Mock
    private BajaUsuarioService bajaUsuarioService;

    @Mock
    private MetodoPagoDAO metodoPagoDAO;

    // ---- PBI 290: pago al hacerse premium ----

    @Test
    void cambiaUnClienteNormalAPremiumPagandoConUnMetodoValido() {
        Cliente cliente = cliente("cliente@example.com", false);
        when(clienteDAO.findByEmail("cliente@example.com")).thenReturn(Optional.of(cliente));
        when(metodoPagoDAO.findByClienteId("cliente-id")).thenReturn(List.of(metodoPago("mp-1", "12/99")));
        when(clienteDAO.save(cliente)).thenReturn(cliente);

        Cliente resultado = servicio().cambiarTipoCliente("cliente@example.com", true, "mp-1");

        assertEquals(true, resultado.isEsPremium());
        assertEquals("Nombre", resultado.getNombre());
        assertEquals("cliente@example.com", resultado.getEmail());
        verify(clienteDAO).save(cliente);
    }

    @Test
    void rechazaHacersePremiumSinMetodoDePago() {
        Cliente cliente = cliente("cliente@example.com", false);
        when(clienteDAO.findByEmail("cliente@example.com")).thenReturn(Optional.of(cliente));

        assertThrows(
                PagoPremiumException.class,
                () -> servicio().cambiarTipoCliente("cliente@example.com", true, null));

        assertEquals(false, cliente.isEsPremium());
        verify(clienteDAO, never()).save(org.mockito.ArgumentMatchers.any(Cliente.class));
    }

    @Test
    void rechazaUnMetodoDePagoQueNoEsDelCliente() {
        Cliente cliente = cliente("cliente@example.com", false);
        when(clienteDAO.findByEmail("cliente@example.com")).thenReturn(Optional.of(cliente));
        when(metodoPagoDAO.findByClienteId("cliente-id")).thenReturn(List.of(metodoPago("mp-1", "12/99")));

        assertThrows(
                PagoPremiumException.class,
                () -> servicio().cambiarTipoCliente("cliente@example.com", true, "mp-de-otro"));

        verify(clienteDAO, never()).save(org.mockito.ArgumentMatchers.any(Cliente.class));
    }

    @Test
    void rechazaUnMetodoDePagoCaducado() {
        Cliente cliente = cliente("cliente@example.com", false);
        when(clienteDAO.findByEmail("cliente@example.com")).thenReturn(Optional.of(cliente));
        when(metodoPagoDAO.findByClienteId("cliente-id")).thenReturn(List.of(metodoPago("mp-1", "01/20")));

        assertThrows(
                PagoPremiumException.class,
                () -> servicio().cambiarTipoCliente("cliente@example.com", true, "mp-1"));

        verify(clienteDAO, never()).save(org.mockito.ArgumentMatchers.any(Cliente.class));
    }

    @Test
    void unClienteYaPremiumNoVuelveAPagar() {
        Cliente cliente = cliente("cliente@example.com", true);
        when(clienteDAO.findByEmail("cliente@example.com")).thenReturn(Optional.of(cliente));
        when(clienteDAO.save(cliente)).thenReturn(cliente);

        Cliente resultado = servicio().cambiarTipoCliente("cliente@example.com", true, null);

        assertEquals(true, resultado.isEsPremium());
        verifyNoInteractions(metodoPagoDAO);
    }

    // ---- Tests originales ----

    @Test
    void cambiaUnClientePremiumAPremiumNormal() {
        Cliente cliente = cliente("cliente@example.com", true);
        when(clienteDAO.findByEmail("cliente@example.com")).thenReturn(Optional.of(cliente));
        when(clienteDAO.save(cliente)).thenReturn(cliente);

        Cliente resultado = new ClienteService(clienteDAO, soporteRegistro, bajaUsuarioService)
                .cambiarTipoCliente("cliente@example.com", false);

        assertEquals(false, resultado.isEsPremium());
        verify(clienteDAO).save(cliente);
    }

    @Test
    void rechazaUnUsuarioNoEncontrado() {
        when(clienteDAO.findByEmail("desconocido@example.com")).thenReturn(Optional.empty());

        assertThrows(
                UsuarioNoEncontradoException.class,
                () -> new ClienteService(clienteDAO, soporteRegistro, bajaUsuarioService)
                        .cambiarTipoCliente("desconocido@example.com", true));

        verify(clienteDAO, never()).save(org.mockito.ArgumentMatchers.any(Cliente.class));
    }

    @Test
    void rechazaUnTipoNulo() {
        assertThrows(
                IllegalArgumentException.class,
                () -> new ClienteService(clienteDAO, soporteRegistro, bajaUsuarioService)
                        .cambiarTipoCliente("cliente@example.com", null));

        verify(clienteDAO, never()).findByEmail(org.mockito.ArgumentMatchers.anyString());
    }

    private ClienteService servicio() {
        return new ClienteService(clienteDAO, soporteRegistro, metodoPagoDAO);
    }

    private MetodoPago metodoPago(String id, String caducidad) {
        MetodoPago metodo = new MetodoPago();
        metodo.setId(id);
        metodo.setClienteId("cliente-id");
        metodo.setTipo("TARJETA");
        metodo.setCaducidad(caducidad);
        return metodo;
    }

    private Cliente cliente(String email, boolean esPremium) {
        Cliente cliente = new Cliente();
        cliente.setId("cliente-id");
        cliente.setNombre("Nombre");
        cliente.setApellidos("Apellidos");
        cliente.setEmail(email);
        cliente.setEsPremium(esPremium);
        return cliente;
    }
}