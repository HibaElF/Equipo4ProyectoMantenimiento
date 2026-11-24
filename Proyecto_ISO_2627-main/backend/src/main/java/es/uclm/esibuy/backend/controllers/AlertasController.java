package es.uclm.esibuy.backend.controllers;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dto.AlertasResponse;
import es.uclm.esibuy.backend.services.AlertaService;

// El cliente es siempre el autenticado: nunca se recibe por parámetro.
@RestController
@RequestMapping("/cliente/alertas")
public class AlertasController {

    private final AlertaService alertaService;

    public AlertasController(AlertaService alertaService) {
        this.alertaService = alertaService;
    }

    @GetMapping
    public AlertasResponse consultar(Authentication authentication) {
        return alertaService.consultar(authentication.getName());
    }

    @PatchMapping("/{alertaId}/leida")
    public AlertasResponse marcarLeida(Authentication authentication, @PathVariable String alertaId) {
        return alertaService.marcarLeida(authentication.getName(), alertaId);
    }

    @PatchMapping("/leidas")
    public AlertasResponse marcarTodasLeidas(Authentication authentication) {
        return alertaService.marcarTodasLeidas(authentication.getName());
    }
}
