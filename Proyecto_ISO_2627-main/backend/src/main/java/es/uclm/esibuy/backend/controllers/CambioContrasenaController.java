package es.uclm.esibuy.backend.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dto.ApiErrorResponse;
import es.uclm.esibuy.backend.dto.CambiarContrasenaRequest;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;
import es.uclm.esibuy.backend.services.CambioContrasenaService;
import es.uclm.esibuy.backend.services.SesionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/usuarios")
public class CambioContrasenaController {

    private final CambioContrasenaService cambioContrasenaService;
    private final SesionService sesionService;

    public CambioContrasenaController(
            CambioContrasenaService cambioContrasenaService,
            SesionService sesionService) {
        this.cambioContrasenaService = cambioContrasenaService;
        this.sesionService = sesionService;
    }

    @PreAuthorize("isAuthenticated()")
    @PutMapping("/contrasena")
    public ResponseEntity<Void> cambiarContrasena(
            Authentication authentication,
            HttpServletRequest request,
            @Valid @RequestBody CambiarContrasenaRequest cuerpo) {
        String email = authentication.getName();
        cambioContrasenaService.cambiar(
                email, request.getRemoteAddr(), cuerpo.contrasenaActual(), cuerpo.nuevaContrasena());

        // Al cambiar las credenciales se rota el identificador de la sesión actual y se cierran
        // todas las demás del usuario.
        if (request.getSession(false) != null) {
            String idNuevo = request.changeSessionId();
            sesionService.registrarSesion(idNuevo, email);
            sesionService.cerrarOtrasSesiones(email, idNuevo);
        } else {
            sesionService.cerrarSesiones(email);
        }
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(LoginRateLimitException.class)
    public ResponseEntity<ApiErrorResponse> manejarLimiteIntentos(LoginRateLimitException excepcion) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", Integer.toString(excepcion.getRetryAfterSeconds()))
                .body(new ApiErrorResponse(excepcion.getMessage()));
    }
}
