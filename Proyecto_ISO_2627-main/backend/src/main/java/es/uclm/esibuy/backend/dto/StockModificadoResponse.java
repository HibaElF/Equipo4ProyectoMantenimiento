package es.uclm.esibuy.backend.dto;

// Respuesta 409 de Gestión de stock: incluye el stock actual para que el formulario se actualice.
public record StockModificadoResponse(String error, int stockActual) {
}
