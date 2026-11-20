package es.uclm.esibuy.backend.services;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

import es.uclm.esibuy.backend.dao.CarritoDAO;
import es.uclm.esibuy.backend.dao.MetodoPagoDAO;
import es.uclm.esibuy.backend.dao.PedidoDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dao.VendedorDAO;
import es.uclm.esibuy.backend.exceptions.OperacionPedidoConflictivaException;
import es.uclm.esibuy.backend.model.Carrito;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.Direccion;
import es.uclm.esibuy.backend.model.EstadoPedido;
import es.uclm.esibuy.backend.model.LineaPedido;
import es.uclm.esibuy.backend.model.Pedido;
import es.uclm.esibuy.backend.model.Producto;
import es.uclm.esibuy.backend.model.Vendedor;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;

/*
 * HU-26 - Compra del carrito dentro de la transacción que abre PedidoService: crea los pedidos,
 * descuenta el stock, los marca como pagados (pago simulado) y vacía el carrito.
 * HU-50 - Se crea un pedido por vendedor, para que cada uno tramite y envíe el suyo.
 */
final class CompraPedido {
    private final CarritoService carritoService;
    private final CarritoDAO carritoDAO;
    private final ProductoDAO productoDAO;
    private final MetodoPagoDAO metodoPagoDAO;
    private final VendedorDAO vendedorDAO;
    private final PedidoDAO pedidoDAO;

    CompraPedido(CarritoService carritoService, CarritoDAO carritoDAO, ProductoDAO productoDAO,
            MetodoPagoDAO metodoPagoDAO, VendedorDAO vendedorDAO, PedidoDAO pedidoDAO) {
        this.carritoService = carritoService;
        this.carritoDAO = carritoDAO;
        this.productoDAO = productoDAO;
        this.metodoPagoDAO = metodoPagoDAO;
        this.vendedorDAO = vendedorDAO;
        this.pedidoDAO = pedidoDAO;
    }

    List<Pedido> comprar(String direccionId, String metodoPagoId, String operacionId) {
        Cliente cliente = carritoService.obtenerClienteAutenticado();
        String compraId = IdempotenciaPedido.identificadorCompra(cliente.getId(), operacionId);
        List<Pedido> anteriores = pedidoDAO.findByCompraIdAndClienteId(compraId, cliente.getId());
        if (!anteriores.isEmpty()) {
            if (anteriores.stream().anyMatch(anterior -> !esLaMismaCompra(anterior, direccionId, metodoPagoId))) {
                throw new OperacionPedidoConflictivaException();
            }
            return List.copyOf(anteriores);
        }
        Direccion direccion = cliente.buscarDireccion(direccionId)
                .orElseThrow(() -> new DatosNoValidosException("La dirección no pertenece al cliente o no existe."));
        boolean metodoPropio = metodoPagoDAO.findByClienteId(cliente.getId()).stream()
                .anyMatch(metodo -> metodoPagoId.equals(metodo.getId())
                        && cliente.getId().equals(metodo.getClienteId()));
        if (!metodoPropio) {
            throw new DatosNoValidosException("El método de pago no pertenece al cliente o no existe.");
        }
        Carrito carrito = carritoDAO.findById(cliente.getId())
                .orElseThrow(() -> new DatosNoValidosException("El carrito está vacío."));
        if (carrito.getProductos().isEmpty()) throw new DatosNoValidosException("El carrito está vacío.");

        List<LineaPedido> lineas = new ArrayList<>();
        List<Producto> productos = new ArrayList<>();
        // Ordenados por id de vendedor: los pedidos se crean siempre en el mismo orden.
        Map<String, List<LineaPedido>> lineasPorVendedor = new TreeMap<>();
        Map<String, BigDecimal> importePorVendedor = new HashMap<>();
        // Orden estable para reducir conflictos entre compras con varios productos.
        for (var entrada : carrito.getProductos().entrySet().stream()
                .sorted(Map.Entry.comparingByKey()).toList()) {
            Producto producto = productoDAO.findById(entrada.getKey()).orElse(null);
            var calculo = carritoService.validarLineaParaCompra(producto, entrada.getValue(), cliente);
            if (producto.getVendedor() == null || producto.getVendedor().isBlank()) {
                throw new DatosNoValidosException("El producto no tiene un vendedor válido.");
            }
            Vendedor vendedor = vendedorDAO.findByNombreComercial(producto.getVendedor())
                    .orElseThrow(() -> new DatosNoValidosException("El vendedor del producto ya no existe."));
            LineaPedido linea = new LineaPedido(producto.getId(), producto.getNombre(), calculo.precioUnitario(),
                    entrada.getValue(), vendedor.getId(), vendedor.getNombreComercial());
            lineas.add(linea);
            productos.add(producto);
            lineasPorVendedor.computeIfAbsent(vendedor.getId(), id -> new ArrayList<>()).add(linea);
            importePorVendedor.put(vendedor.getId(), importePorVendedor
                    .getOrDefault(vendedor.getId(), BigDecimal.ZERO.setScale(2)).add(calculo.subtotal()));
        }
        Instant fechaCreacion = Instant.now();
        String clienteNombre = (cliente.getNombre() + " " + cliente.getApellidos()).trim();
        List<Pedido> pedidos = new ArrayList<>();
        for (var grupo : lineasPorVendedor.entrySet()) {
            Pedido pedido = Pedido.builder()
                    .id(IdempotenciaPedido.identificadorPedido(cliente.getId(), operacionId, grupo.getKey()))
                    .compraId(compraId)
                    .clienteId(cliente.getId())
                    .lineas(grupo.getValue())
                    .estado(EstadoPedido.EN_PROCESO)
                    .importe(importePorVendedor.get(grupo.getKey()))
                    .fechaCreacion(fechaCreacion)
                    .direccionEnvio(direccion)
                    .metodoPagoId(metodoPagoId)
                    .build();
            pedido.setClienteNombre(clienteNombre);
            pedidoDAO.insert(pedido);
            pedidos.add(pedido);
        }
        for (int i = 0; i < productos.size(); i++) {
            productoDAO.descontarStock(productos.get(i), lineas.get(i).cantidad());
        }
        Instant fechaPago = Instant.now();
        List<Pedido> pagados = new ArrayList<>();
        for (Pedido pedido : pedidos) {
            Pedido pagado = pedido.pagado(fechaPago);
            pedidoDAO.save(pagado);
            pagados.add(pagado);
        }
        carritoDAO.save(carrito.vacio());
        return List.copyOf(pagados);
    }

    // Repetir la operación solo devuelve los pedidos si es la misma compra y ningún vendedor la ha tocado aún.
    private static boolean esLaMismaCompra(Pedido anterior, String direccionId, String metodoPagoId) {
        return Objects.equals(metodoPagoId, anterior.getMetodoPagoId())
                && anterior.getDireccionEnvio() != null
                && direccionId.equals(anterior.getDireccionEnvio().getId())
                && anterior.getEstado() == EstadoPedido.PAGADO_COMPLETADO;
    }
}
