package es.uclm.esibuy.backend.controllers;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import es.uclm.esibuy.backend.dto.ApiErrorResponse;
import es.uclm.esibuy.backend.exceptions.AccountPendingException;
import es.uclm.esibuy.backend.exceptions.ContrasenaCaducadaException;
import es.uclm.esibuy.backend.exceptions.CorreoNoVerificadoException;
import es.uclm.esibuy.backend.exceptions.LoginRateLimitException;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> manejarCredencialesIncorrectas(BadCredentialsException excepcion) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(excepcion.getMessage()));
    }

    @ExceptionHandler(LoginRateLimitException.class)
    public ResponseEntity<ApiErrorResponse> manejarLimiteIntentos(LoginRateLimitException excepcion) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", Integer.toString(excepcion.getRetryAfterSeconds()))
                .body(new ApiErrorResponse(excepcion.getMessage()));
    }

    @ExceptionHandler(ContrasenaCaducadaException.class)
    public ResponseEntity<ApiErrorResponse> manejarContrasenaCaducada(ContrasenaCaducadaException excepcion) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(excepcion.getMessage(),
                        Map.of("codigo", List.of(ContrasenaCaducadaException.CODIGO))));
    }

    @ExceptionHandler(CorreoNoVerificadoException.class)
    public ResponseEntity<ApiErrorResponse> manejarCorreoNoVerificado(CorreoNoVerificadoException excepcion) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(excepcion.getMessage()));
    }

    @ExceptionHandler(AccountPendingException.class)
    public ResponseEntity<ApiErrorResponse> manejarCuentaPendiente(AccountPendingException excepcion) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(excepcion.getMessage()));
    }
}
