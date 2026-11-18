package es.uclm.esibuy.backend.controllers;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import es.uclm.esibuy.backend.dto.ApiErrorResponse;
import es.uclm.esibuy.backend.dto.StockModificadoResponse;
import es.uclm.esibuy.backend.exceptions.StockModificadoException;

// Gestión de stock: los cambios simultáneos sobre un producto se avisan con un 409 y no con un error 500.
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = VendedorController.class)
public class ProductoVendedorExceptionHandler {
    @ExceptionHandler(StockModificadoException.class)
    public ResponseEntity<StockModificadoResponse> stockModificado(StockModificadoException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new StockModificadoResponse(exception.getMessage(), exception.getStockActual()));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> productoModificado(OptimisticLockingFailureException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(exception.getMessage()));
    }
}
