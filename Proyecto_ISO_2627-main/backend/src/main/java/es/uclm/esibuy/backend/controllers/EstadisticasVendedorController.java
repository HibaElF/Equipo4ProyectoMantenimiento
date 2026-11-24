package es.uclm.esibuy.backend.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.services.EstadisticasVendedorService;

// Estadísticas del vendedor: siempre de los productos del vendedor de la sesión.
@RestController
@RequestMapping("/vendedor/estadisticas")
@PreAuthorize("hasRole('VENDEDOR')")
public class EstadisticasVendedorController {

    private final EstadisticasVendedorService estadisticasVendedorService;

    public EstadisticasVendedorController(EstadisticasVendedorService estadisticasVendedorService) {
        this.estadisticasVendedorService = estadisticasVendedorService;
    }

    // PBI 276: productos más y menos vendidos
    @GetMapping("/ventas")
    public EstadisticasVentasResponse consultarVentas(Authentication authentication) {
        return estadisticasVendedorService.consultarVentas(authentication.getName());
    }
}
