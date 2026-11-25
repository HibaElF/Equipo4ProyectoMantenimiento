package es.uclm.esibuy.backend.services;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.CategoriaDAO;
import es.uclm.esibuy.backend.dao.ClienteDAO;
import es.uclm.esibuy.backend.dto.CategoriaFavoritaResponse;
import es.uclm.esibuy.backend.exceptions.CategoriaNoEncontradaException;
import es.uclm.esibuy.backend.exceptions.UsuarioNoEncontradoException;
import es.uclm.esibuy.backend.model.Categoria;
import es.uclm.esibuy.backend.model.Cliente;

@Service
public class CategoriaFavoritaService {

    private final ClienteDAO clienteDAO;
    private final CategoriaDAO categoriaDAO;

    public CategoriaFavoritaService(
            ClienteDAO clienteDAO,
            CategoriaDAO categoriaDAO) {

        this.clienteDAO = clienteDAO;
        this.categoriaDAO = categoriaDAO;
    }

    public List<CategoriaFavoritaResponse> consultar(String emailAutenticado) {
        return construirRespuesta(obtenerCliente(emailAutenticado));
    }

    public List<CategoriaFavoritaResponse> anadir(
            String emailAutenticado,
            String categoriaId) {

        validarIdCategoria(categoriaId);

        Categoria categoria = categoriaDAO.findById(categoriaId)
                .orElseThrow(CategoriaNoEncontradaException::new);

        Cliente cliente = obtenerCliente(emailAutenticado);

        if (cliente.agregarCategoriaFavorita(categoria.getId())) {
            clienteDAO.save(cliente);
        }

        return construirRespuesta(cliente);
    }

    public List<CategoriaFavoritaResponse> quitar(
            String emailAutenticado,
            String categoriaId) {

        validarIdCategoria(categoriaId);

        Cliente cliente = obtenerCliente(emailAutenticado);

        if (cliente.eliminarCategoriaFavorita(categoriaId)) {
            clienteDAO.save(cliente);
        }

        return construirRespuesta(cliente);
    }

    // Se respeta el orden en que el cliente marcó las categorías y se omiten
    // las que el administrador haya eliminado después.
    private List<CategoriaFavoritaResponse> construirRespuesta(Cliente cliente) {
        List<String> ids = cliente.getCategoriasFavoritas();

        if (ids.isEmpty()) {
            return List.of();
        }

        Map<String, Categoria> categorias = new HashMap<>();

        categoriaDAO.findAllById(ids).forEach(
                categoria -> categorias.put(categoria.getId(), categoria)
        );

        return ids.stream()
                .map(categorias::get)
                .filter(Objects::nonNull)
                .map(categoria -> new CategoriaFavoritaResponse(
                        categoria.getId(),
                        categoria.getNombre()
                ))
                .toList();
    }

    private Cliente obtenerCliente(String emailAutenticado) {
        if (emailAutenticado == null || emailAutenticado.isBlank()) {
            throw new UsuarioNoEncontradoException();
        }

        return clienteDAO.findByEmail(
                emailAutenticado.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(UsuarioNoEncontradoException::new);
    }

    private void validarIdCategoria(String categoriaId) {
        if (categoriaId == null || categoriaId.isBlank()) {
            throw new IllegalArgumentException(
                    "El identificador de la categoría es obligatorio."
            );
        }
    }
}
