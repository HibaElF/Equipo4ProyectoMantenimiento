package es.uclm.esibuy.backend.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dto.EstadisticasValoracionesResponse;
import es.uclm.esibuy.backend.dto.EstadisticasVentasResponse;
import es.uclm.esibuy.backend.services.EstadisticasAdministradorService;

// Estadísticas globales de la plataforma: las puede consultar cualquier administrador.
@RestController
@RequestMapping("/administrador/estadisticas")
@PreAuthorize("hasRole('ADMIN')")
public class EstadisticasAdministradorController {

    private final EstadisticasAdministradorService estadisticasAdministradorService;

    public EstadisticasAdministradorController(EstadisticasAdministradorService estadisticasAdministradorService) {
        this.estadisticasAdministradorService = estadisticasAdministradorService;
    }

    // PBI 279: productos más y menos vendidos de todas las tiendas
    @GetMapping("/ventas")
    public EstadisticasVentasResponse consultarVentas() {
        return estadisticasAdministradorService.consultarVentas();
    }

    // PBI 280: productos mejor y peor valorados de todas las tiendas
    @GetMapping("/valoraciones")
    public EstadisticasValoracionesResponse consultarValoraciones() {
        return estadisticasAdministradorService.consultarValoraciones();
    }
}
