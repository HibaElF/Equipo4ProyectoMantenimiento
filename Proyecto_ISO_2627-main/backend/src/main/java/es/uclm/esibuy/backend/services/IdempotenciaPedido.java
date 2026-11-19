package es.uclm.esibuy.backend.services;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

/*
 * HU-26 - Clave de operación que hace idempotente la compra: los ids de la compra y de sus pedidos
 * se derivan del cliente y de la operación, así que repetir la misma petición devuelve los mismos pedidos.
 */
final class IdempotenciaPedido {

    private IdempotenciaPedido() {
    }

    static String normalizarOperacion(String operacionId) {
        if (operacionId == null || !operacionId.matches(
                "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")) {
            throw new IllegalArgumentException("La clave de operación debe ser un UUID.");
        }
        return UUID.fromString(operacionId).toString();
    }

    static String identificadorCompra(String clienteId, String operacionId) {
        return resumen(clienteId + ":" + operacionId);
    }

    // HU-50: cada vendedor de la compra tiene su propio pedido.
    static String identificadorPedido(String clienteId, String operacionId, String vendedorId) {
        return resumen(clienteId + ":" + operacionId + ":" + vendedorId);
    }

    private static String resumen(String texto) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(texto.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
