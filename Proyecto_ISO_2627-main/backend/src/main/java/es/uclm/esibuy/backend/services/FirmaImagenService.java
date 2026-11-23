package es.uclm.esibuy.backend.services;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.util.Base64;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// T-34: URLs firmadas con caducidad para /product-images/**. La firma es HMAC-SHA256(nombre ":" expiración)
// con una clave propia (IMAGENES_FIRMA_KEY). Es el único punto que construye la URL que ve el cliente.
public class FirmaImagenService {

    public static final String RUTA_PUBLICA = "/product-images/";
    public static final String PARAMETRO_EXPIRACION = "exp";
    public static final String PARAMETRO_FIRMA = "sig";

    private static final int LONGITUD_CLAVE = 32;
    private static final long VENTANA_SEGUNDOS = 3600;

    public enum Resultado {
        VALIDA, INVALIDA, CADUCADA
    }

    private final byte[] clave;
    private final Duration vigencia;
    private final Clock reloj;

    public FirmaImagenService(String claveBase64, Duration vigencia, Clock reloj) {
        this.clave = decodificarClave(claveBase64);
        if (vigencia == null || vigencia.isZero() || vigencia.isNegative()) {
            throw new IllegalStateException("La vigencia de las URLs de imágenes debe ser positiva.");
        }
        this.vigencia = vigencia;
        this.reloj = reloj;
    }

    // Servicio sin firma, solo para las pruebas que construyen los servicios con «new».
    private FirmaImagenService() {
        this.clave = null;
        this.vigencia = Duration.ofHours(2);
        this.reloj = Clock.systemUTC();
    }

    public static FirmaImagenService sinFirma() {
        return new FirmaImagenService();
    }

    private static byte[] decodificarClave(String claveBase64) {
        if (claveBase64 == null || claveBase64.isBlank()) {
            throw new IllegalStateException("IMAGENES_FIRMA_KEY debe estar configurada.");
        }
        try {
            byte[] decodificada = Base64.getDecoder().decode(claveBase64);
            if (decodificada.length != LONGITUD_CLAVE) {
                throw new IllegalArgumentException();
            }
            return decodificada;
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("IMAGENES_FIRMA_KEY debe ser una clave Base64 de 32 bytes.", e);
        }
    }

    // Devuelve la URL firmada de un valor guardado (/product-images/<nombre>). Lo que no es una imagen
    // propia (null, vacío, otra ruta) se devuelve tal cual.
    public String firmar(String valorGuardado) {
        if (clave == null || valorGuardado == null || !valorGuardado.startsWith(RUTA_PUBLICA)) {
            return valorGuardado;
        }
        String nombre = valorGuardado.substring(RUTA_PUBLICA.length());
        if (nombre.isEmpty() || nombre.contains("/") || nombre.contains("?")) {
            return valorGuardado;
        }
        long expiracion = expiracionActual();
        return RUTA_PUBLICA + nombre + "?" + PARAMETRO_EXPIRACION + "=" + expiracion
                + "&" + PARAMETRO_FIRMA + "=" + calcular(nombre, expiracion);
    }

    // La caducidad se redondea a la siguiente hora en punto: la URL es estable dentro de la ventana y el
    // navegador puede cachear la imagen.
    private long expiracionActual() {
        long objetivo = reloj.instant().plus(vigencia).getEpochSecond();
        return ((objetivo + VENTANA_SEGUNDOS - 1) / VENTANA_SEGUNDOS) * VENTANA_SEGUNDOS;
    }

    // Primero se comprueba la firma (que incluye la expiración) y solo entonces se mira la caducidad.
    public Resultado verificar(String nombre, String expiracion, String firma) {
        if (clave == null || nombre == null || nombre.isEmpty() || expiracion == null || firma == null) {
            return Resultado.INVALIDA;
        }
        long caducidad;
        try {
            caducidad = Long.parseLong(expiracion);
        } catch (NumberFormatException e) {
            return Resultado.INVALIDA;
        }
        byte[] esperada = calcular(nombre, caducidad).getBytes(StandardCharsets.US_ASCII);
        if (!MessageDigest.isEqual(esperada, firma.getBytes(StandardCharsets.US_ASCII))) {
            return Resultado.INVALIDA;
        }
        return reloj.instant().getEpochSecond() > caducidad ? Resultado.CADUCADA : Resultado.VALIDA;
    }

    private String calcular(String nombre, long expiracion) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clave, "HmacSHA256"));
            byte[] firma = mac.doFinal((nombre + ":" + expiracion).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(firma);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo firmar la URL de la imagen.", e);
        }
    }
}
