package es.uclm.esibuy.backend.exceptions;

// Gestión de stock: el stock cambió (por ejemplo, por una venta) mientras el vendedor editaba el producto.
public class StockModificadoException extends RuntimeException {
    private final int stockActual;

    public StockModificadoException(int stockActual) {
        super("El stock ha cambiado mientras editabas: ahora hay " + unidades(stockActual)
                + ". Revisa la cantidad y vuelve a guardar.");
        this.stockActual = stockActual;
    }

    public int getStockActual() {
        return stockActual;
    }

    private static String unidades(int stock) {
        return stock == 1 ? "1 unidad" : stock + " unidades";
    }
}
