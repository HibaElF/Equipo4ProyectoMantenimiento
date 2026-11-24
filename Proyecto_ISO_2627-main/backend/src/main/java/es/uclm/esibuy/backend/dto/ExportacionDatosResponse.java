package es.uclm.esibuy.backend.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

import es.uclm.esibuy.backend.model.CambioEstadoPedido;
import es.uclm.esibuy.backend.model.EstadoPedido;

// T-25: copia de los datos personales de su titular (derechos de acceso y portabilidad). Es un DTO explícito:
// no contiene hashes ni historial de contraseñas, secretos TOTP, códigos de respaldo, tokens ni el token del
// método de pago. Las secciones que no corresponden al tipo de usuario van a null y no se serializan.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ExportacionDatosResponse(
        Instant fechaExportacion,
        String tipoUsuario,
        Perfil perfil,
        Cuenta cuenta,
        List<Direccion> direcciones,
        List<MetodoPago> metodosPago,
        List<Pedido> pedidos,
        List<Lista> listas,
        Map<String, Integer> carrito,
        List<Valoracion> valoraciones,
        List<Producto> productos,
        List<PedidoRecibido> pedidosRecibidos) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Perfil(
            String nombre,
            String apellidos,
            String email,
            String telefono,
            String imagenPerfil,
            String dniNif,
            LocalDate fechaNacimiento,
            Boolean esPremium,
            String nombreComercial,
            String categoriaId,
            String sede,
            LocalDate fechaIncorporacion) {
    }

    public record Cuenta(
            boolean activada,
            boolean bloqueada,
            boolean correoVerificado,
            boolean totpActivado,
            boolean emailOtpActivado,
            String versionPoliticaAceptada,
            Instant fechaAceptacionPolitica,
            Instant contrasenaCambiadaEn) {
    }

    public record Direccion(
            String nombre,
            String calle,
            String numero,
            String portal,
            String piso,
            String codigoPostal,
            String ciudad,
            String provincia) {
    }

    public record MetodoPago(
            String tipo,
            String nombre,
            String referenciaEnmascarada,
            String titular,
            String caducidad,
            Instant fechaAlta) {
    }

    public record LineaPedido(
            String productoId,
            String nombreProducto,
            BigDecimal precioCompra,
            int cantidad,
            String nombreVendedor) {
    }

    public record Pedido(
            String id,
            String compraId,
            EstadoPedido estado,
            Instant fechaCreacion,
            Instant fechaPago,
            BigDecimal importe,
            Direccion direccionEnvio,
            List<LineaPedido> lineas,
            List<CambioEstadoPedido> historialEstados) {
    }

    public record Lista(
            String nombre,
            boolean predeterminada,
            List<String> productos) {
    }

    public record Valoracion(
            String pedidoId,
            String productoId,
            int puntuacion,
            String comentario) {
    }

    public record Producto(
            String id,
            String nombre,
            String categoria,
            int stock,
            String descripcion,
            Double precio,
            int descuento,
            int descuentoPremium,
            boolean soloPremium,
            boolean esVisible,
            String imagen) {
    }

    // Pedido recibido por un vendedor: solo sus propias líneas, sin datos del comprador.
    public record PedidoRecibido(
            String id,
            EstadoPedido estado,
            Instant fechaCreacion,
            List<LineaPedido> lineas) {
    }
}
