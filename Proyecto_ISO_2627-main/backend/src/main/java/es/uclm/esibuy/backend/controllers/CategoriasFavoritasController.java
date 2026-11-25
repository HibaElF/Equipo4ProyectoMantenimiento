package es.uclm.esibuy.backend.controllers;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dto.CategoriaFavoritaResponse;
import es.uclm.esibuy.backend.services.CategoriaFavoritaService;

// Bajo /cliente/**: SecurityConfiguration solo permite el acceso al rol CLIENTE.
@RestController
@RequestMapping("/cliente/categorias-favoritas")
public class CategoriasFavoritasController {

    private final CategoriaFavoritaService categoriaFavoritaService;

    public CategoriasFavoritasController(
            CategoriaFavoritaService categoriaFavoritaService) {

        this.categoriaFavoritaService = categoriaFavoritaService;
    }

    @GetMapping
    public List<CategoriaFavoritaResponse> consultar(
            Authentication authentication) {

        return categoriaFavoritaService.consultar(authentication.getName());
    }

    @PutMapping("/{categoriaId}")
    public List<CategoriaFavoritaResponse> anadir(
            Authentication authentication,
            @PathVariable String categoriaId) {

        return categoriaFavoritaService.anadir(
                authentication.getName(),
                categoriaId
        );
    }

    @DeleteMapping("/{categoriaId}")
    public List<CategoriaFavoritaResponse> quitar(
            Authentication authentication,
            @PathVariable String categoriaId) {

        return categoriaFavoritaService.quitar(
                authentication.getName(),
                categoriaId
        );
    }
}
