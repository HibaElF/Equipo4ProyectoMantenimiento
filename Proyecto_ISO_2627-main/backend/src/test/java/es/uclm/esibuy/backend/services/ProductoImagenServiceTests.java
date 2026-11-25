package es.uclm.esibuy.backend.services;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import java.util.zip.CRC32;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;

import org.junit.jupiter.api.BeforeEach;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockMultipartFile;

class ProductoImagenServiceTests {
    // T-33: imágenes reales (decodificables), porque el servicio las recodifica antes de guardarlas.
    static final byte[] PNG = imagenReal("png", 4, 4, BufferedImage.TYPE_INT_ARGB);
    static final byte[] JPG = imagenReal("jpg", 4, 4, BufferedImage.TYPE_INT_RGB);
    static final byte[] GIF = imagenReal("gif", 4, 4, BufferedImage.TYPE_INT_RGB);
    private static final String MENSAJE = "La imagen debe ser PNG, JPG o GIF y no superar 5 MB.";

    @TempDir
    Path directorioTemporal;

    private ProductoImagenService servicio;

    @BeforeEach
    void preparar() {
        servicio = new ProductoImagenService(directorioTemporal.toString());
    }

    static byte[] imagenReal(String formato, int ancho, int alto, int tipo) {
        BufferedImage imagen = new BufferedImage(ancho, alto, tipo);
        for (int x = 0; x < ancho; x++) {
            for (int y = 0; y < alto; y++) {
                imagen.setRGB(x, y, 0xFF000000 | ((x * 40) & 0xFF) << 16 | ((y * 40) & 0xFF) << 8 | 0x80);
            }
        }
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try {
            ImageIO.write(imagen, formato, salida);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        return salida.toByteArray();
    }

    // Añade un trozo auxiliar (p. ej. tEXt) justo después de IHDR.
    static byte[] pngConTrozo(byte[] png, String tipo, byte[] datos) {
        byte[] nombre = tipo.getBytes(StandardCharsets.US_ASCII);
        CRC32 crc = new CRC32();
        crc.update(nombre);
        crc.update(datos);
        ByteBuffer trozo = ByteBuffer.allocate(12 + datos.length);
        trozo.putInt(datos.length).put(nombre).put(datos).putInt((int) crc.getValue());
        return insertar(png, 33, trozo.array());
    }

    static byte[] insertar(byte[] base, int posicion, byte[] extra) {
        byte[] resultado = new byte[base.length + extra.length];
        System.arraycopy(base, 0, resultado, 0, posicion);
        System.arraycopy(extra, 0, resultado, posicion, extra.length);
        System.arraycopy(base, posicion, resultado, posicion + extra.length, base.length - posicion);
        return resultado;
    }

    private static boolean contiene(byte[] contenido, String texto) {
        return new String(contenido, StandardCharsets.ISO_8859_1).contains(texto);
    }

    private static BufferedImage decodificar(byte[] contenido) throws IOException {
        BufferedImage imagen = ImageIO.read(new ByteArrayInputStream(contenido));
        assertNotNull(imagen, "La imagen guardada debe poder decodificarse");
        return imagen;
    }

    private byte[] guardadoEnDisco(String ruta) throws IOException {
        return Files.readAllBytes(directorioTemporal.resolve(Path.of(ruta).getFileName().toString()));
    }

    private static MockMultipartFile imagen(String nombre, String contentType, byte[] contenido) {
        return new MockMultipartFile("imagen", nombre, contentType, contenido);
    }

    private static byte[] texto(String contenido) {
        return contenido.getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] concatenar(byte[] base, String extra) {
        byte[] adicional = texto(extra);
        byte[] resultado = new byte[base.length + adicional.length];
        System.arraycopy(base, 0, resultado, 0, base.length);
        System.arraycopy(adicional, 0, resultado, base.length, adicional.length);
        return resultado;
    }

    // PNG real relleno con un trozo auxiliar hasta alcanzar exactamente el tamaño indicado.
    private static byte[] pngDeTamano(int tamano) {
        return pngConTrozo(PNG, "tEXt", new byte[tamano - PNG.length - 12]);
    }

    private void assertRechazada(MockMultipartFile imagen) throws IOException {
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> servicio.guardar(imagen));
        assertEquals(MENSAJE, error.getMessage());
        try (Stream<Path> archivos = Files.list(directorioTemporal)) {
            assertEquals(0, archivos.count(), "No debe guardarse ningún archivo");
        }
    }

    static Stream<Arguments> imagenesValidas() {
        return Stream.of(
                Arguments.of("foto.png", "image/png", PNG, ".png"),
                Arguments.of("foto.jpg", "image/jpeg", JPG, ".jpg"),
                Arguments.of("foto.JPEG", "image/jpeg", JPG, ".jpg"),
                Arguments.of("foto.gif", "image/gif", GIF, ".gif"));
    }

    @ParameterizedTest
    @MethodSource("imagenesValidas")
    void guardaYEliminaImagenValidaConNombreSeguro(String nombre, String contentType, byte[] contenido, String extension) {
        String ruta = servicio.guardar(imagen(nombre, contentType, contenido));
        String guardado = Path.of(ruta).getFileName().toString();
        Path archivo = directorioTemporal.resolve(guardado);

        assertTrue(ruta.startsWith("/product-images/"));
        assertTrue(guardado.endsWith(extension));
        assertFalse(guardado.toLowerCase().contains("foto"), "El nombre original no se reutiliza");
        assertTrue(Files.exists(archivo));
        servicio.eliminar(ruta);
        assertFalse(Files.exists(archivo));
    }

    @Test
    void sinImagenDevuelveNull() {
        assertNull(servicio.guardar(null));
        assertNull(servicio.guardar(imagen("vacia.png", "image/png", new byte[0])));
    }

    @Test
    void rechazaScriptRenombradoComoPng() throws IOException {
        assertRechazada(imagen("script.png", "image/png", texto("<?php system($_GET[0]); ?>")));
        assertRechazada(imagen("script.png", "image/png", texto("<script>alert(1)</script>")));
    }

    @Test
    void rechazaExtensionOContentTypeQueNoCoincidenConElTipoReal() throws IOException {
        assertRechazada(imagen("foto.jpg", "image/png", PNG));
        assertRechazada(imagen("foto.png", "image/jpeg", PNG));
        assertRechazada(imagen("foto.php", "image/png", PNG));
        assertRechazada(imagen("foto", "image/png", PNG));
        assertRechazada(imagen("foto.png", "text/html", PNG));
        assertRechazada(imagen("foto.png", null, PNG));
    }

    @Test
    void rechazaDobleExtensionYNombresConRuta() throws IOException {
        assertRechazada(imagen("foto.png.php", "image/png", PNG));
        assertRechazada(imagen("../foto.png", "image/png", PNG));
        assertRechazada(imagen("..\\foto.png", "image/png", PNG));
        assertRechazada(imagen("foto\0.png", "image/png", PNG));
        assertRechazada(imagen(null, "image/png", PNG));
    }

    @Test
    void rechazaArchivosPoliglotasConDatosTrasLaImagen() throws IOException {
        assertRechazada(imagen("poli.png", "image/png", concatenar(PNG, "<?php echo 1; ?>")));
        assertRechazada(imagen("poli.jpg", "image/jpeg", concatenar(JPG, "<script>alert(1)</script>")));
        assertRechazada(imagen("poli.gif", "image/gif", concatenar(GIF, "<?php echo 1; ?>")));
    }

    @Test
    void rechazaImagenesTruncadas() throws IOException {
        assertRechazada(imagen("corta.png", "image/png", new byte[] { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A }));
        assertRechazada(imagen("corta.jpg", "image/jpeg", new byte[] { (byte) 0xFF, (byte) 0xD8 }));
    }

    @Test
    void rechazaImagenMayorDeCincoMegabytes() throws IOException {
        assertRechazada(imagen("grande.png", "image/png", pngDeTamano(5 * 1024 * 1024 + 1)));
    }

    @Test
    void aceptaImagenDeExactamenteCincoMegabytes() {
        assertNotNull(servicio.guardar(imagen("limite.png", "image/png", pngDeTamano(5 * 1024 * 1024))));
    }

    @Test
    void rechazaTiposNoPermitidos() throws IOException {
        assertRechazada(imagen("archivo.svg", "image/svg+xml", texto("<svg/>")));
        assertRechazada(imagen("doc.pdf", "application/pdf", texto("%PDF-1.4")));
        assertRechazada(imagen("pagina.html", "text/html", texto("<html></html>")));
        assertRechazada(imagen("programa.exe", "application/octet-stream", new byte[] { 'M', 'Z', 0, 0 }));
        assertRechazada(imagen("foto.webp", "image/webp", new byte[] { 'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P' }));
    }

    @Test
    void verificaLaImagenAntesDeGuardarlaCuandoVirusTotalEstaActivo() throws IOException {
        VirusTotalService virusTotal = mock(VirusTotalService.class);
        ProductoImagenService servicioConAnalisis = new ProductoImagenService(
                directorioTemporal.toString(), "local", null, virusTotal);

        String ruta = servicioConAnalisis.guardar(imagen("foto.png", "image/png", PNG));

        assertNotNull(ruta);
        ArgumentCaptor<byte[]> enviado = ArgumentCaptor.forClass(byte[].class);
        verify(virusTotal).verificar(enviado.capture(), eq("image/png"));
        // VirusTotal analiza la imagen recodificada, que es la que se guarda.
        assertArrayEquals(enviado.getValue(), guardadoEnDisco(ruta));
    }

    @Test
    void noGuardaLaImagenSiVirusTotalLaRechaza() throws IOException {
        VirusTotalService virusTotal = mock(VirusTotalService.class);
        doThrow(new IllegalArgumentException("La imagen ha sido rechazada por el análisis de seguridad."))
                .when(virusTotal).verificar(any(byte[].class), eq("image/png"));
        ProductoImagenService servicioConAnalisis = new ProductoImagenService(
                directorioTemporal.toString(), "local", null, virusTotal);

        assertThrows(IllegalArgumentException.class,
                () -> servicioConAnalisis.guardar(imagen("maliciosa.png", "image/png", PNG)));

        try (Stream<Path> archivos = Files.list(directorioTemporal)) {
            assertEquals(0, archivos.count());
        }
    }

    @Test
    void guardaImagenesRecodificadasQueSeSiguenDecodificandoConSuTamano() throws IOException {
        for (Object[] caso : new Object[][] {
                { "a.png", "image/png", PNG }, { "a.jpg", "image/jpeg", JPG }, { "a.gif", "image/gif", GIF } }) {
            String ruta = servicio.guardar(imagen((String) caso[0], (String) caso[1], (byte[]) caso[2]));
            BufferedImage guardada = decodificar(guardadoEnDisco(ruta));
            assertEquals(4, guardada.getWidth());
            assertEquals(4, guardada.getHeight());
        }
    }

    @Test
    void eliminaLosMetadatosDelPng() throws IOException {
        byte[] conTexto = pngConTrozo(PNG, "tEXt", texto("Comment\0GPS-secreto-12.34"));
        assertTrue(contiene(conTexto, "GPS-secreto"));

        String ruta = servicio.guardar(imagen("foto.png", "image/png", conTexto));

        byte[] guardado = guardadoEnDisco(ruta);
        assertFalse(contiene(guardado, "GPS-secreto"));
        assertFalse(contiene(guardado, "tEXt"));
        decodificar(guardado);
    }

    @Test
    void eliminaExifYComentariosDelJpeg() throws IOException {
        byte[] comentario = texto("camara-secreta-1234");
        byte[] segmento = new byte[4 + comentario.length];
        segmento[0] = (byte) 0xFF;
        segmento[1] = (byte) 0xFE;
        segmento[2] = 0;
        segmento[3] = (byte) (comentario.length + 2);
        System.arraycopy(comentario, 0, segmento, 4, comentario.length);
        byte[] conComentario = insertar(JPG, 2, segmento);
        assertTrue(contiene(conComentario, "camara-secreta"));

        String ruta = servicio.guardar(imagen("foto.jpg", "image/jpeg", conComentario));

        byte[] guardado = guardadoEnDisco(ruta);
        assertFalse(contiene(guardado, "camara-secreta"));
        decodificar(guardado);
    }

    @Test
    void eliminaLosComentariosDelGif() throws IOException {
        byte[] comentario = texto("autor-secreto-99");
        byte[] extension = new byte[3 + comentario.length + 1];
        extension[0] = 0x21;
        extension[1] = (byte) 0xFE;
        extension[2] = (byte) comentario.length;
        System.arraycopy(comentario, 0, extension, 3, comentario.length);
        byte[] conComentario = insertar(GIF, GIF.length - 1, extension);
        assertTrue(contiene(conComentario, "autor-secreto"));

        String ruta = servicio.guardar(imagen("foto.gif", "image/gif", conComentario));

        byte[] guardado = guardadoEnDisco(ruta);
        assertFalse(contiene(guardado, "autor-secreto"));
        decodificar(guardado);
    }

    @Test
    void rechazaImagenCorruptaConFirmaYFinValidos() throws IOException {
        byte[] corrupta = PNG.clone();
        for (int i = 40; i < corrupta.length - 20; i++) {
            corrupta[i] = (byte) 0x5A;
        }
        assertRechazada(imagen("rota.png", "image/png", corrupta));

        byte[] jpgRoto = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 1, 2, 3, 4, 5, (byte) 0xFF, (byte) 0xD9 };
        assertRechazada(imagen("rota.jpg", "image/jpeg", jpgRoto));
    }

    @Test
    void rechazaDimensionesPorEncimaDelLimite() throws IOException {
        byte[] ancha = imagenReal("png", ProductoImagenService.LADO_MAXIMO + 1, 1, BufferedImage.TYPE_BYTE_GRAY);
        byte[] alta = imagenReal("png", 1, ProductoImagenService.LADO_MAXIMO + 1, BufferedImage.TYPE_BYTE_GRAY);
        assertRechazada(imagen("ancha.png", "image/png", ancha));
        assertRechazada(imagen("alta.png", "image/png", alta));
    }

    @Test
    void aceptaImagenEnElLimiteDeDimensiones() {
        byte[] limite = imagenReal("png", ProductoImagenService.LADO_MAXIMO, 1, BufferedImage.TYPE_BYTE_GRAY);
        assertNotNull(servicio.guardar(imagen("limite.png", "image/png", limite)));
    }

    @Test
    void rechazaElGifAnimadoYAceptaElEstatico() throws IOException {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        ImageWriter escritor = ImageIO.getImageWritersByFormatName("gif").next();
        try (MemoryCacheImageOutputStream destino = new MemoryCacheImageOutputStream(salida)) {
            escritor.setOutput(destino);
            escritor.prepareWriteSequence(null);
            BufferedImage fotograma = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
            escritor.writeToSequence(new IIOImage(fotograma, null, null), null);
            escritor.writeToSequence(new IIOImage(fotograma, null, null), null);
            escritor.endWriteSequence();
        } finally {
            escritor.dispose();
        }

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.guardar(imagen("anim.gif", "image/gif", salida.toByteArray())));
        assertEquals("El GIF no puede ser animado.", error.getMessage());
        try (Stream<Path> archivos = Files.list(directorioTemporal)) {
            assertEquals(0, archivos.count());
        }
        assertNotNull(servicio.guardar(imagen("fija.gif", "image/gif", GIF)));
    }

    @Test
    void eliminarNoSaleDelDirectorioDeImagenes() throws IOException {
        Path fuera = Files.createTempFile("fuera", ".png");
        try {
            String ruta = "/product-images/../" + fuera.getFileName();
            assertThrows(IllegalArgumentException.class, () -> servicio.eliminar(ruta));
            assertTrue(Files.exists(fuera));
        } finally {
            Files.deleteIfExists(fuera);
        }
    }
}
