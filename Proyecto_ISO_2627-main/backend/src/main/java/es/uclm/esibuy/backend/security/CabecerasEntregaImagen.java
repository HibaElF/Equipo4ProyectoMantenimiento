package es.uclm.esibuy.backend.security;

// T-35: cabeceras de la entrega de /product-images/**, comunes al modo local y al modo MongoDB.
// No se añade Cross-Origin-Resource-Policy: same-origin porque rompería la visualización en desarrollo
// (frontend en :4200 y API en :8443).
public final class CabecerasEntregaImagen {

    public static final String NOSNIFF = "nosniff";
    public static final String POLITICA_CONTENIDO = "default-src 'none'; sandbox";
    public static final String DISPOSICION = "inline; filename=\"imagen\"";

    private CabecerasEntregaImagen() {
    }
}
