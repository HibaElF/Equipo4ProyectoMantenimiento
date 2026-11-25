package es.uclm.esibuy.backend.controllers;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dto.ApiErrorResponse;
import es.uclm.esibuy.backend.dto.ExportacionDatosResponse;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.services.ExportacionDatosService;

// T-25: descarga de los datos personales del propio usuario en JSON.
@RestController
@RequestMapping("/usuarios")
public class ExportacionDatosController {

    private final ExportacionDatosService exportacionDatosService;

    public ExportacionDatosController(ExportacionDatosService exportacionDatosService) {
        this.exportacionDatosService = exportacionDatosService;
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/mis-datos")
    public ResponseEntity<ExportacionDatosResponse> exportar(Authentication authentication) {
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"mis-datos.json\"")
                .cacheControl(CacheControl.noStore())
                .body(exportacionDatosService.exportar(authentication.getName()));
    }

    @ExceptionHandler(LoginRateLimitException.class)
    public ResponseEntity<ApiErrorResponse> manejarLimite(LoginRateLimitException excepcion) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", Integer.toString(excepcion.getRetryAfterSeconds()))
                .body(new ApiErrorResponse(excepcion.getMessage()));
    }
}
