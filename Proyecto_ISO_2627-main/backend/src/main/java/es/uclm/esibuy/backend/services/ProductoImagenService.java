package es.uclm.esibuy.backend.services;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import es.uclm.esibuy.backend.exceptions.DatosNoValidosException;

@Service
public class ProductoImagenService {
    private static final long TAMANO_MAXIMO = 5L * 1024 * 1024;
    private static final String RUTA_PUBLICA = "/product-images/";
    private static final String MENSAJE_IMAGEN_NO_VALIDA = "La imagen debe ser PNG, JPG o GIF y no superar 5 MB.";
    private static final String MENSAJE_GIF_ANIMADO = "El GIF no puede ser animado.";
    // T-33: límites para evitar «bombas de descompresión» y decodificaciones que no terminan.
    static final int LADO_MAXIMO = 4000;
    static final long PIXELES_MAXIMOS = 16_000_000L;
    private static final long TIEMPO_MAXIMO_SEGUNDOS = 10;
    private static final float CALIDAD_JPEG = 0.85f;
    private static final ExecutorService RECODIFICADOR = Executors.newCachedThreadPool(tarea -> {
        Thread hilo = new Thread(tarea, "recodificador-imagenes");
        hilo.setDaemon(true);
        return hilo;
    });

    // Lista blanca: tipo real detectado -> Content-Type declarado, extensiones de nombre admitidas y extensión final.
    private enum TipoImagen {
        PNG("image/png", ".png", "png"),
        JPG("image/jpeg", ".jpg", "jpg", "jpeg"),
        GIF("image/gif", ".gif", "gif");

        private final String contentType;
        private final String extensionGuardada;
        private final List<String> extensionesNombre;

        TipoImagen(String contentType, String extensionGuardada, String... extensionesNombre) {
            this.contentType = contentType;
            this.extensionGuardada = extensionGuardada;
            this.extensionesNombre = List.of(extensionesNombre);
        }
    }

    private final Path directorio;
    private final ProductoImagenMongoService almacenMongo;
    private final boolean usarMongo;
    private final VirusTotalService virusTotalService;

    // Constructor conservado para los tests actuales del modo local.
    public ProductoImagenService(String directorio) {
        this.directorio = Path.of(directorio)
                .toAbsolutePath()
                .normalize();

        this.almacenMongo = null;
        this.usarMongo = false;
        this.virusTotalService = null;
    }

    // Constructor que utiliza Spring Boot en la aplicación real.
    // Constructor conservado para los tests del almacenamiento MongoDB.
    public ProductoImagenService(String directorio, String almacenamiento,
            ProductoImagenMongoService almacenMongo) {
        this(directorio, almacenamiento, almacenMongo, null);
    }

    @Autowired
    public ProductoImagenService(
            @Value("${app.productos.imagenes.directorio:uploads/productos}")
            String directorio,
            @Value("${app.productos.imagenes.almacenamiento:local}")
            String almacenamiento,
            ProductoImagenMongoService almacenMongo,
            VirusTotalService virusTotalService) {

        this.directorio = Path.of(directorio)
                .toAbsolutePath()
                .normalize();

        if (!"local".equals(almacenamiento)
                && !"mongo".equals(almacenamiento)) {
            throw new DatosNoValidosException(
                    "Almacenamiento de imágenes desconocido: "
                            + almacenamiento);
        }

        this.almacenMongo = almacenMongo;
        this.usarMongo = "mongo".equals(almacenamiento);
        this.virusTotalService = virusTotalService;
    }

    public String guardar(MultipartFile imagen) {
        if (imagen == null || imagen.isEmpty()) {
            return null;
        }

        if (imagen.getSize() > TAMANO_MAXIMO) {
            throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
        }

        byte[] contenido;
        try {
            contenido = imagen.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer la imagen del producto.", e);
        }

        TipoImagen tipo = detectarTipoReal(contenido);
        // El tipo real, el Content-Type y la extensión del nombre deben coincidir; si no, el archivo es ambiguo.
        if (tipo == null
                || !tipo.contentType.equals(imagen.getContentType())
                || !tieneExtensionSegura(imagen.getOriginalFilename(), tipo)
                || !terminaCorrectamente(contenido, tipo)) {
            throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
        }

        // T-33: se guardan los bytes recodificados, sin metadatos ni datos ocultos.
        contenido = recodificarConLimite(contenido, tipo);

        // El nombre original nunca se usa: se genera uno propio con una extensión de la lista blanca.
        if (virusTotalService != null) {
            virusTotalService.verificar(contenido, tipo.contentType);
        }

        String nombreArchivo = UUID.randomUUID() + tipo.extensionGuardada;

        if (usarMongo) {
            almacenMongo.guardar(
                    nombreArchivo,
                    tipo.contentType,
                    contenido);

            return RUTA_PUBLICA + nombreArchivo;
        }

        Path destino = directorio.resolve(nombreArchivo).normalize();
        if (!destino.startsWith(directorio)) {
            throw new IllegalArgumentException("La ruta de la imagen no es válida.");
        }

        try {
            Files.createDirectories(directorio);
            Files.write(destino, contenido);
            return RUTA_PUBLICA + nombreArchivo;
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo guardar la imagen del producto.", e);
        }
    }

    private static byte[] recodificarConLimite(byte[] contenido, TipoImagen tipo) {
        Future<byte[]> tarea = RECODIFICADOR.submit(() -> recodificar(contenido, tipo));
        try {
            return tarea.get(TIEMPO_MAXIMO_SEGUNDOS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            tarea.cancel(true);
            throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
        } catch (InterruptedException e) {
            tarea.cancel(true);
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Se interrumpió el procesado de la imagen.", e);
        } catch (ExecutionException e) {
            if (e.getCause() instanceof DatosNoValidosException noValida) {
                throw noValida;
            }
            throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
        }
    }

    // Decodifica y vuelve a codificar la imagen: se pierden EXIF, comentarios y cualquier dato oculto.
    private static byte[] recodificar(byte[] contenido, TipoImagen tipo) throws IOException {
        BufferedImage imagen;
        try (ImageInputStream entrada = ImageIO.createImageInputStream(new ByteArrayInputStream(contenido))) {
            Iterator<ImageReader> lectores = ImageIO.getImageReaders(entrada);
            if (!lectores.hasNext()) {
                throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
            }
            ImageReader lector = lectores.next();
            try {
                lector.setInput(entrada, false, true);
                // Las dimensiones se leen del encabezado, antes de reservar memoria para los píxeles.
                long ancho = lector.getWidth(0);
                long alto = lector.getHeight(0);
                if (ancho <= 0 || alto <= 0 || ancho > LADO_MAXIMO || alto > LADO_MAXIMO
                        || ancho * alto > PIXELES_MAXIMOS) {
                    throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
                }
                if (tipo == TipoImagen.GIF && lector.getNumImages(true) > 1) {
                    throw new DatosNoValidosException(MENSAJE_GIF_ANIMADO);
                }
                imagen = lector.read(0);
            } finally {
                lector.dispose();
            }
        } catch (RuntimeException e) {
            if (e instanceof DatosNoValidosException) {
                throw e;
            }
            throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
        }
        if (imagen == null) {
            throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
        }

        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        switch (tipo) {
            case JPG -> escribirJpeg(imagen, salida);
            case PNG -> escribir(imagen, "png", salida);
            case GIF -> escribir(imagen, "gif", salida);
        }
        return salida.toByteArray();
    }

    private static void escribir(BufferedImage imagen, String formato, ByteArrayOutputStream salida)
            throws IOException {
        if (!ImageIO.write(imagen, formato, salida)) {
            throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
        }
    }

    // El JPEG no admite transparencia: se pasa a RGB sobre fondo blanco y se usa una calidad fija.
    private static void escribirJpeg(BufferedImage imagen, ByteArrayOutputStream salida) throws IOException {
        BufferedImage rgb = new BufferedImage(imagen.getWidth(), imagen.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D grafico = rgb.createGraphics();
        try {
            grafico.drawImage(imagen, 0, 0, Color.WHITE, null);
        } finally {
            grafico.dispose();
        }
        Iterator<ImageWriter> escritores = ImageIO.getImageWritersByFormatName("jpeg");
        if (!escritores.hasNext()) {
            throw new IllegalStateException("No hay codificador JPEG disponible.");
        }
        ImageWriter escritor = escritores.next();
        try (MemoryCacheImageOutputStream destino = new MemoryCacheImageOutputStream(salida)) {
            ImageWriteParam parametros = escritor.getDefaultWriteParam();
            parametros.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            parametros.setCompressionQuality(CALIDAD_JPEG);
            escritor.setOutput(destino);
            escritor.write(null, new IIOImage(rgb, null, null), parametros);
        } finally {
            escritor.dispose();
        }
    }

    // Firma (magic bytes) del archivo: no se confía en la extensión ni en el Content-Type.
    private static TipoImagen detectarTipoReal(byte[] c) {
        if (empiezaPor(c, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
            return TipoImagen.PNG;
        }
        if (empiezaPor(c, 0xFF, 0xD8, 0xFF)) {
            return TipoImagen.JPG;
        }
        if (empiezaPor(c, 'G', 'I', 'F', '8', '7', 'a') || empiezaPor(c, 'G', 'I', 'F', '8', '9', 'a')) {
            return TipoImagen.GIF;
        }
        return null;
    }

    // Rechaza políglotas: la imagen debe acabar con su marca de fin, sin datos añadidos detrás.
    private static boolean terminaCorrectamente(byte[] c, TipoImagen tipo) {
        return switch (tipo) {
            case PNG -> termina(c, 0x00, 0x00, 0x00, 0x00, 'I', 'E', 'N', 'D', 0xAE, 0x42, 0x60, 0x82);
            case JPG -> termina(c, 0xFF, 0xD9);
            case GIF -> termina(c, 0x3B);
        };
    }

    // Solo la última extensión cuenta, y el nombre no puede llevar rutas ni caracteres de control.
    private static boolean tieneExtensionSegura(String nombreOriginal, TipoImagen tipo) {
        if (!StringUtils.hasText(nombreOriginal)
                || nombreOriginal.chars().anyMatch(c -> c < 0x20 || c == '/' || c == '\\')) {
            return false;
        }
        int punto = nombreOriginal.lastIndexOf('.');
        return punto > 0 && tipo.extensionesNombre.contains(nombreOriginal.substring(punto + 1).toLowerCase(Locale.ROOT));
    }

    private static boolean empiezaPor(byte[] contenido, int... esperado) {
        if (contenido.length < esperado.length) {
            return false;
        }
        for (int i = 0; i < esperado.length; i++) {
            if ((contenido[i] & 0xFF) != esperado[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean termina(byte[] contenido, int... esperado) {
        int inicio = contenido.length - esperado.length;
        if (inicio < 0) {
            return false;
        }
        for (int i = 0; i < esperado.length; i++) {
            if ((contenido[inicio + i] & 0xFF) != esperado[i]) {
                return false;
            }
        }
        return true;
    }

    public void eliminar(String rutaPublica) {

        if (rutaPublica == null
                || !rutaPublica.startsWith(RUTA_PUBLICA)) {
            return;
        }

        String nombre = rutaPublica.substring(
                RUTA_PUBLICA.length());

        if (usarMongo) {
            almacenMongo.eliminar(nombre);
            return;
        }

        Path archivo = directorio.resolve(nombre).normalize();

        if (!archivo.startsWith(directorio)) {
            throw new DatosNoValidosException(
                    "La ruta de la imagen no es válida.");
        }

        try {
            Files.deleteIfExists(archivo);
        } catch (IOException e) {
            throw new IllegalStateException(
                    "No se pudo eliminar la imagen del producto.", e);
        }
    }
}
