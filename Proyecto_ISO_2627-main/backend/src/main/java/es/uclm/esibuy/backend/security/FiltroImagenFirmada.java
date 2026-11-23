package es.uclm.esibuy.backend.security;

import java.io.IOException;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import es.uclm.esibuy.backend.services.FirmaImagenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

// T-34: solo se sirven las imágenes de /product-images/** con una URL firmada y vigente. Sin firma o con una
// firma inválida: 403; firma correcta pero caducada: 410. Sirve para los dos modos de almacenamiento.
public class FiltroImagenFirmada extends OncePerRequestFilter {

    private final FirmaImagenService firmas;

    public FiltroImagenFirmada(FirmaImagenService firmas) {
        this.firmas = firmas;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(FirmaImagenService.RUTA_PUBLICA)
                || HttpMethod.OPTIONS.matches(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String nombre = request.getRequestURI().substring(FirmaImagenService.RUTA_PUBLICA.length());
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
