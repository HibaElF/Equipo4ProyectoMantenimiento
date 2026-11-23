package es.uclm.esibuy.backend.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import es.uclm.esibuy.backend.dto.ApiErrorResponse;
import es.uclm.esibuy.backend.dto.VerificarCorreoRequest;
import es.uclm.esibuy.backend.exceptions.TokenVerificacionCorreoInvalidoException;
import es.uclm.esibuy.backend.services.VerificacionCorreoService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/usuarios")
public class VerificacionCorreoController {

    private final VerificacionCorreoService servicio;

    public VerificacionCorreoController(VerificacionCorreoService servicio) {
        this.servicio = servicio;
    }

    // Público: quien abre el enlace del correo aún no puede iniciar sesión.
    @PostMapping("/verificar-correo")
    public ResponseEntity<Void> verificar(@Valid @RequestBody VerificarCorreoRequest request) {
        servicio.verificar(request.token());
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(TokenVerificacionCorreoInvalidoException.class)
    public ResponseEntity<ApiErrorResponse> tokenInvalido(TokenVerificacionCorreoInvalidoException excepcion) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(excepcion.getMessage()));
    }
}
