package es.uclm.esibuy.backend.security;

import java.io.IOException;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import es.uclm.esibuy.backend.services.FirmaImagenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// T-34: solo se sirven las imágenes de /product-images/** con una URL firmada y vigente. Sin firma o con una
// firma inválida: 403; firma correcta pero caducada: 410. Sirve para los dos modos de almacenamiento.
public class FiltroImagenFirmada extends OncePerRequestFilter {

    // Se compara la ruta decodificada, la misma que ven Spring MVC y el gestor de recursos: codificar una
    // letra de «product-images» no sirve la imagen sin firma.
    private static final PathPatternRequestMatcher IMAGENES =
            PathPatternRequestMatcher.pathPattern(FirmaImagenService.RUTA_PUBLICA + "**");
    private static final PathPatternRequestMatcher UNA_IMAGEN =
            PathPatternRequestMatcher.pathPattern(FirmaImagenService.RUTA_PUBLICA + "{nombre}");

    private final FirmaImagenService firmas;

    public FiltroImagenFirmada(FirmaImagenService firmas) {
        this.firmas = firmas;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return HttpMethod.OPTIONS.matches(request.getMethod()) || !IMAGENES.matches(request);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        // Nombre ya decodificado; es null (y se responde 403) si la ruta no apunta a un único fichero.
        String nombre = UNA_IMAGEN.matcher(request).getVariables().get("nombre");
        FirmaImagenService.Resultado resultado = firmas.verificar(nombre,
                request.getParameter(FirmaImagenService.PARAMETRO_EXPIRACION),
                request.getParameter(FirmaImagenService.PARAMETRO_FIRMA));

        switch (resultado) {
            case VALIDA -> chain.doFilter(request, response);
            case CADUCADA -> response.setStatus(HttpStatus.GONE.value());
            default -> response.setStatus(HttpStatus.FORBIDDEN.value());
        }
    }
}
