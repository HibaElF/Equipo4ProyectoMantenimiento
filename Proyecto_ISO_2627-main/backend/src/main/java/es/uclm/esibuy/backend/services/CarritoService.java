package es.uclm.esibuy.backend.services;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import es.uclm.esibuy.backend.dao.CarritoDAO;
import es.uclm.esibuy.backend.dao.ClienteDAO;
import es.uclm.esibuy.backend.dao.ProductoDAO;
import es.uclm.esibuy.backend.dto.CarritoResponse;
import es.uclm.esibuy.backend.dto.LineaCarritoResponse;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;
import es.uclm.esibuy.backend.exceptions.ProductoNoEncontradoException;
import es.uclm.esibuy.backend.model.Carrito;
import es.uclm.esibuy.backend.model.Cliente;
import es.uclm.esibuy.backend.model.Producto;

@Service
public class CarritoService {
    private static final String MENSAJE_CARRITO_NO_ACTUALIZADO = "No se ha podido actualizar el carrito.";
    private static final String MENSAJE_SOLO_PREMIUM = "Este producto solo está disponible para clientes Premium.";
    private static final String MENSAJE_PRECIO_NO_DISPONIBLE = "Un producto del carrito no tiene un precio disponible.";
    private static final String MENSAJE_CANTIDAD_NO_VALIDA = "La cantidad de un producto del carrito no es válida.";
    private static final int MAXIMO_INTENTOS = 3;
    private final CarritoDAO carritoDAO;
    private final ClienteDAO clienteDAO;
    private final ProductoDAO productoDAO;
    private final FirmaImagenService firmaImagenes;

    // Constructor sin firma de URLs, conservado para las pruebas que construyen el servicio con «new».
    public CarritoService(CarritoDAO carritoDAO, ClienteDAO clienteDAO, ProductoDAO productoDAO) {
        this(carritoDAO, clienteDAO, productoDAO, FirmaImagenService.sinFirma());
    }

    @Autowired
    public CarritoService(CarritoDAO carritoDAO, ClienteDAO clienteDAO, ProductoDAO productoDAO,
            FirmaImagenService firmaImagenes) {
        this.firmaImagenes = firmaImagenes;
        this.carritoDAO = carritoDAO;
        this.clienteDAO = clienteDAO;
        this.productoDAO = productoDAO;
    }

    public Carrito anadirProducto(String idProducto, int cantidad) {
        return actualizarCarrito(idProducto, cantidad).carrito();
    }

    public CarritoResponse anadirProductoConImporte(String idProducto, int cantidad) {
        return actualizarCarrito(idProducto, cantidad).respuesta();
    }

    public CarritoResponse consultarCarrito() {
        Cliente cliente = obtenerClienteAutenticado();
        return presentarCarrito(carritoDAO.findById(cliente.getId())
                .orElseGet(() -> new Carrito(cliente.getId())), cliente);
    }

    public CarritoResponse modificarCantidad(String idProducto, int cantidad) {
        return modificarLinea(idProducto, cantidad);
    }

    public CarritoResponse eliminarProducto(String idProducto) {
        return modificarLinea(idProducto, null);
    }

    public CarritoResponse descartarCarrito() {
        Cliente cliente = obtenerClienteAutenticado();
        return reintentarSiHayConflicto(() -> {
            Carrito carrito = carritoDAO.findById(cliente.getId()).orElse(null);
            if (carrito == null) {
                return presentarCarrito(new Carrito(cliente.getId()), cliente);
            }
            Carrito vacio = carrito.vacio();
            carritoDAO.save(vacio);
            // PBI 291: al vaciar el carrito se devuelve el stock reservado
            carrito.getProductos().forEach(this::liberarStock);
            return presentarCarrito(vacio, cliente);
        });
    }

    /*
     * PBI 291 - Reserva de stock: el stock se descuenta al añadir al carrito y se devuelve
     * al quitar productos, bajar la cantidad o vaciar el carrito. Al pagar ya no se descuenta.
     */
    private void reservarStock(Producto producto, int cantidad) {
        if (cantidad > producto.getStock()) {
            throw new DatosNoValidosException("No hay stock suficiente para la cantidad solicitada.");
        }
        productoDAO.descontarStock(producto, cantidad);
    }

    private void liberarStock(String idProducto, int cantidad) {
        if (cantidad <= 0) {
            return;
        }
        try {
            productoDAO.reponerStock(idProducto, cantidad);
        } catch (OptimisticLockingFailureException productoEliminado) {
            // El producto ya no existe: no hay stock que devolver.
        }
    }

    // Si el carrito no se puede guardar (conflicto u otro fallo), se deshace la reserva.
    private Carrito guardarConReserva(Carrito carrito, String idProducto, int reservado) {
        try {
            return carritoDAO.save(carrito);
        } catch (RuntimeException exception) {
            liberarStock(idProducto, reservado);
            throw exception;
        }
    }

    /*
     * Repite la operación si otra petición ha modificado el mismo carrito a la vez (@Version)
     * o si dos primeras altas simultáneas chocan; en el último intento relanza la excepción.
     */
    private <T> T reintentarSiHayConflicto(Supplier<T> operacion) {
        for (int intento = 1; intento <= MAXIMO_INTENTOS; intento++) {
            try {
                return operacion.get();
            } catch (OptimisticLockingFailureException | DuplicateKeyException exception) {
                if (intento == MAXIMO_INTENTOS) {
                    throw exception;
                }
            }
        }
        throw new IllegalStateException(MENSAJE_CARRITO_NO_ACTUALIZADO);
    }

    private CarritoResponse modificarLinea(String idProducto, Integer cantidad) {
        Cliente cliente = obtenerClienteAutenticado();
        if (idProducto == null || idProducto.isBlank()) {
            throw new DatosNoValidosException("El producto es obligatorio.");
        }
        if (cantidad != null && cantidad <= 0) {
            throw new DatosNoValidosException(MENSAJE_CANTIDAD_NO_VALIDA);
        }
        return reintentarSiHayConflicto(() -> {
            Carrito carrito = carritoDAO.findById(cliente.getId())
                    .orElseThrow(ProductoNoEncontradoException::new);
            if (!carrito.getProductos().containsKey(idProducto)) {
                throw new ProductoNoEncontradoException();
            }
            int cantidadActual = carrito.cantidadDe(idProducto);
            if (cantidad == null) {
                // Eliminar la línea: se guarda el carrito y se devuelve todo lo reservado.
                Carrito actualizado = carrito.sinProducto(idProducto);
                carritoDAO.save(actualizado);
                liberarStock(idProducto, cantidadActual);
                return presentarCarrito(actualizado, cliente);
            }
            Producto producto = obtenerProductoModificable(idProducto, cantidad, cliente);
            // Se calcula antes de reservar o liberar: el objeto «producto» no se actualiza tras cambiar el stock.
            int maximo = stockParaCliente(producto.getStock(), cantidadActual);
            int diferencia = cantidad - cantidadActual;
            Carrito actualizado = carrito.conCantidad(idProducto, cantidad);
            if (diferencia > 0) {
                // Sube la cantidad: se reserva solo la diferencia.
                reservarStock(producto, diferencia);
                guardarConReserva(actualizado, idProducto, diferencia);
            } else {
                // Baja la cantidad: se guarda y se devuelve la diferencia.
                carritoDAO.save(actualizado);
                liberarStock(idProducto, -diferencia);
            }
            return presentarCarrito(actualizado, cliente, producto, maximo);
        });
    }

    private Producto obtenerProductoModificable(String idProducto, int cantidad, Cliente cliente) {
        Producto producto = productoDAO.findById(idProducto)
                .orElseThrow(ProductoNoEncontradoException::new);
        if (producto.isSoloPremium() && !cliente.isEsPremium()) {
            throw new AccessDeniedException(MENSAJE_SOLO_PREMIUM);
        }
        String aviso = comprobarDisponibilidad(producto, cantidad, cliente);
        if (aviso != null) {
            throw new DatosNoValidosException(aviso);
        }
        return producto;
    }

    private CarritoResponse presentarCarrito(Carrito carrito, Cliente cliente) {
        return presentarCarrito(carrito, cliente, null, 0);
    }

    /*
     * PBI 291 - Con la reserva, el stock guardado del producto es el que queda libre: las unidades del carrito
     * ya están descontadas. En cada línea se devuelve el stock que el cliente puede llegar a tener en su
     * carrito (libre + reservado por él), que es el máximo que admite al cambiar la cantidad.
     * «maximoModificado» es ese valor para el producto que se acaba de modificar, calculado antes del cambio.
     */
    private CarritoResponse presentarCarrito(Carrito carrito, Cliente cliente, Producto productoModificado,
            int maximoModificado) {
        List<LineaCarritoResponse> lineas = new ArrayList<>();
        BigDecimal importe = BigDecimal.ZERO.setScale(2);
        for (var entrada : carrito.getProductos().entrySet()) {
            Producto producto = productoModificado != null && entrada.getKey().equals(productoModificado.getId())
                    ? productoModificado : productoDAO.findById(entrada.getKey()).orElse(null);
            boolean esModificado = productoModificado != null && producto == productoModificado;
            Integer maximo = producto == null ? null
                    : esModificado ? maximoModificado : stockParaCliente(producto.getStock(), entrada.getValue());
            String aviso = comprobarDisponibilidad(producto, entrada.getValue(), cliente);
            if (aviso == null) {
                LineaCarritoResponse linea = calcularLinea(producto, entrada.getValue(), cliente, maximo);
                importe = importe.add(linea.subtotal());
                lineas.add(linea);
            } else {
                lineas.add(lineaNoDisponible(entrada.getKey(), entrada.getValue(), producto, aviso, maximo));
            }
        }
        return new CarritoResponse(List.copyOf(lineas), importe);
    }

    private LineaCarritoResponse lineaNoDisponible(String idProducto, int cantidad, Producto producto,
            String aviso, Integer stockParaCliente) {
        if (producto == null) {
            return new LineaCarritoResponse(idProducto, cantidad, null, null, "Producto eliminado", null, null,
                    false, aviso, null);
        }
        return new LineaCarritoResponse(idProducto, cantidad, null, null, producto.getNombre(),
                firmaImagenes.firmar(producto.getImagen()), stockParaCliente, false, aviso, producto.getVendedor());
    }

    private String comprobarDisponibilidad(Producto producto, int cantidad, Cliente cliente) {
        if (producto == null) return "El producto ha sido eliminado.";
        if (!producto.isEsVisible()) return "El producto ya no está disponible.";
        if (producto.isSoloPremium() && !cliente.isEsPremium()) {
            return MENSAJE_SOLO_PREMIUM;
        }
        // PBI 291: las unidades del carrito ya están reservadas (descontadas del stock),
        // así que aquí no se compara con el stock restante.
        if (cantidad <= 0) {
            return MENSAJE_CANTIDAD_NO_VALIDA;
        }
        Double precio = producto.getPrecio();
        if (precio == null || !Double.isFinite(precio) || precio < 0) {
            return MENSAJE_PRECIO_NO_DISPONIBLE;
        }
        Double precioAplicable = PrecioProducto.paraCliente(producto, cliente.isEsPremium());
        if (precioAplicable == null || !Double.isFinite(precioAplicable) || precioAplicable < 0) {
            return MENSAJE_PRECIO_NO_DISPONIBLE;
        }
        return null;
    }

    // Stock que el cliente puede tener en su carrito: el libre más lo que ya tiene reservado.
    private static int stockParaCliente(int stockLibre, int enCarrito) {
        return (int) Math.min(Integer.MAX_VALUE, (long) Math.max(0, stockLibre) + Math.max(0, enCarrito));
    }

    private LineaCarritoResponse calcularLinea(Producto producto, int cantidad, Cliente cliente,
            int stockParaCliente) {
        Double precio = PrecioProducto.paraCliente(producto, cliente.isEsPremium());
        if (precio == null || !Double.isFinite(precio) || precio < 0) {
            throw new DatosNoValidosException(MENSAJE_PRECIO_NO_DISPONIBLE);
        }
        BigDecimal precioUnitario = BigDecimal.valueOf(precio).setScale(2);
        BigDecimal subtotal = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
        return new LineaCarritoResponse(producto.getId(), cantidad, precioUnitario, subtotal,
                producto.getNombre(), firmaImagenes.firmar(producto.getImagen()), stockParaCliente, true, null,
                producto.getVendedor());
    }

    private Resultado actualizarCarrito(String idProducto, int cantidad) {
        Cliente cliente = obtenerClienteAutenticado();
        if (cantidad <= 0) {
            throw new DatosNoValidosException(MENSAJE_CANTIDAD_NO_VALIDA);
        }
        if (idProducto == null || idProducto.isBlank()) {
            throw new DatosNoValidosException("El producto es obligatorio.");
        }

        return reintentarSiHayConflicto(() -> {
            Producto producto = productoDAO.findById(idProducto)
                    .orElseThrow(ProductoNoEncontradoException::new);
            if (!producto.isEsVisible()) {
                throw new DatosNoValidosException("El producto ya no está disponible.");
            }
            if (producto.isSoloPremium() && !cliente.isEsPremium()) {
                throw new AccessDeniedException(MENSAJE_SOLO_PREMIUM);
            }

            Carrito carrito = carritoDAO.findById(cliente.getId())
                    .orElseGet(() -> new Carrito(cliente.getId()));
            long cantidadFinal = (long) carrito.cantidadDe(idProducto) + cantidad;
            if (cantidad > producto.getStock() || cantidadFinal > Integer.MAX_VALUE) {
                throw new DatosNoValidosException("No hay stock suficiente para la cantidad total solicitada.");
            }

            Carrito actualizado = carrito.conCantidad(idProducto, (int) cantidadFinal);
            // Antes de reservar: el objeto «producto» no se actualiza tras descontar el stock.
            int maximo = stockParaCliente(producto.getStock(), carrito.cantidadDe(idProducto));
            CarritoResponse respuesta = calcularImporte(actualizado, cliente, producto, maximo);
            // PBI 291: se reserva (descuenta) la cantidad añadida.
            reservarStock(producto, cantidad);
            return new Resultado(guardarConReserva(actualizado, idProducto, cantidad), respuesta);
        });
    }

    private record Resultado(Carrito carrito, CarritoResponse respuesta) {
    }

    private CarritoResponse calcularImporte(Carrito carrito, Cliente cliente, Producto productoAnadido,
            int maximoAnadido) {
        List<LineaCarritoResponse> lineas = new ArrayList<>();
        BigDecimal importe = BigDecimal.ZERO.setScale(2);
        for (var entrada : carrito.getProductos().entrySet()) {
            Producto producto = entrada.getKey().equals(productoAnadido.getId())
                    ? productoAnadido
                    : productoDAO.findById(entrada.getKey()).orElseThrow(ProductoNoEncontradoException::new);
            if (!producto.isEsVisible()) {
                throw new DatosNoValidosException("Un producto del carrito ya no está disponible.");
            }
            if (producto.isSoloPremium() && !cliente.isEsPremium()) {
                throw new AccessDeniedException("Un producto del carrito solo está disponible para clientes Premium.");
            }
           if (entrada.getValue() <= 0) {
                throw new DatosNoValidosException(MENSAJE_CANTIDAD_NO_VALIDA);
            }
           
            int maximo = producto == productoAnadido ? maximoAnadido
                    : stockParaCliente(producto.getStock(), entrada.getValue());
            LineaCarritoResponse linea = calcularLinea(producto, entrada.getValue(), cliente, maximo);
            lineas.add(linea);
            importe = importe.add(linea.subtotal());
        }
        return new CarritoResponse(List.copyOf(lineas), importe);
    }

    LineaCarritoResponse validarLineaParaCompra(Producto producto, int cantidad, Cliente cliente) {
        String aviso = comprobarDisponibilidad(producto, cantidad, cliente);
        if (aviso != null) throw new DatosNoValidosException(aviso);
        return calcularLinea(producto, cantidad, cliente, stockParaCliente(producto.getStock(), cantidad));
    }

    Cliente obtenerClienteAutenticado() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getAuthorities().stream()
                        .noneMatch(authority -> "ROLE_CLIENTE".equals(authority.getAuthority()))) {
            throw new AccessDeniedException("Solo un cliente autenticado puede modificar su carrito.");
        }
        return clienteDAO.findByEmail(authentication.getName())
                .filter(cliente -> cliente.isActivada() && !cliente.isBloqueada())
                .orElseThrow(() -> new AccessDeniedException(
                        "Solo un cliente activo puede modificar su carrito."));
    }
}