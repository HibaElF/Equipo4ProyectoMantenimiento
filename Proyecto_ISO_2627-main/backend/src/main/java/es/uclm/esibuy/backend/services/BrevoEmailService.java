package es.uclm.esibuy.backend.services;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class BrevoEmailService {

    private static final String CAMPO_EMAIL = "email";
    private static final String URL_ENVIO = "https://api.brevo.com/v3/smtp/email";
    private static final String CABECERA_API_KEY = "api-key";
    private static final String CAMPO_REMITENTE = "sender";
    private static final String CAMPO_ASUNTO = "subject";
    private static final String CAMPO_TEXTO = "textContent";
    private static final String MENSAJE_SIN_CONFIGURAR = "Falta configurar la API de Brevo o el remitente.";

    private static final Logger LOGGER = LoggerFactory.getLogger(BrevoEmailService.class);

    private final String apiKey;
    private final String emailRemitente;
    private final String nombreRemitente;
    private final RestClient restClient;

    public BrevoEmailService(
            @Value("${brevo.api-key:}") String apiKey,
            @Value("${brevo.from-email:}") String emailRemitente,
            @Value("${brevo.from-name:ESIBuy}") String nombreRemitente) {
        this.apiKey = apiKey;
        this.emailRemitente = emailRemitente;
        this.nombreRemitente = nombreRemitente;
        this.restClient = RestClient.create();
    }

    /**
     * Envía el correo de recuperación fuera del hilo de la petición, para que
     * la respuesta no tarde más cuando el correo existe. Los fallos solo se
     * registran: el cliente siempre recibe la misma respuesta genérica.
     */
    @Async
    public void enviarRecuperacionEnSegundoPlano(String destinatario, String enlace) {
        try {
            enviarRecuperacion(destinatario, enlace);
        } catch (RestClientException | IllegalStateException exception) {
            LOGGER.error("No se pudo enviar el correo de recuperación mediante Brevo.", exception);
        }
    }

    public void enviarRecuperacion(String destinatario, String enlace) {
        enviar(destinatario, "Recupera tu contraseña de ESIBuy", """
                        Hemos recibido una solicitud para cambiar la contraseña de tu cuenta ESIBuy.

                        Para elegir una contraseña nueva, abre este enlace:
                        %s

                        Si no solicitaste el cambio, ignora este correo.
                        """.formatted(enlace));
    }

    /**
     * Avisa al titular de que su cuenta se ha bloqueado temporalmente por intentos fallidos. Va en
     * segundo plano para no alterar el tiempo de respuesta del login; los fallos solo se registran.
     */
    @Async
    public void enviarAvisoBloqueoEnSegundoPlano(String destinatario) {
        try {
            enviarAvisoBloqueo(destinatario);
        } catch (RestClientException | IllegalStateException exception) {
            LOGGER.error("No se pudo enviar el aviso de bloqueo mediante Brevo.", exception);
        }
    }

    public void enviarAvisoBloqueo(String destinatario) {
        enviar(destinatario, "Aviso de seguridad de tu cuenta de ESIBuy", """
                        Hemos detectado varios intentos fallidos de acceso a tu cuenta de ESIBuy.

                        Por seguridad, el acceso a tu cuenta se ha bloqueado temporalmente.
                        Si has sido tú, espera unos minutos e inténtalo de nuevo.
                        Si no has sido tú, cambia tu contraseña en cuanto puedas.
                        """);
    }

    /** Confirmación del correo de una cuenta nueva; en segundo plano para no alterar la respuesta del alta. */
    @Async
    public void enviarVerificacionCorreoEnSegundoPlano(String destinatario, String enlace) {
        try {
            enviarVerificacionCorreo(destinatario, enlace);
        } catch (RestClientException | IllegalStateException exception) {
            LOGGER.error("No se pudo enviar el correo de verificación mediante Brevo.", exception);
        }
    }

    public void enviarVerificacionCorreo(String destinatario, String enlace) {
        enviar(destinatario, "Confirma tu correo en ESIBuy", """
                        Hemos recibido una solicitud de registro en ESIBuy con este correo.

                        Para confirmar que la dirección es tuya, abre este enlace (caduca en 24 horas y solo puede usarse una vez):
                        %s

                        Si no has solicitado el registro, ignora este correo.
                        """.formatted(enlace));
    }

    public void enviarCodigoAutenticacion(String destinatario, String codigo) {
        enviar(destinatario, "Código de verificación de ESIBuy", """
                        Tu código de verificación de ESIBuy es: %s

                        Caduca en 10 minutos y solo se puede utilizar una vez.
                        Si no estás intentando iniciar sesión, ignora este correo.
                        """.formatted(codigo));
    }

    private void enviar(String destinatario, String asunto, String texto) {
        if (apiKey.isBlank() || emailRemitente.isBlank()) {
            throw new IllegalStateException(MENSAJE_SIN_CONFIGURAR);
        }

        Map<String, Object> cuerpo = Map.of(
                CAMPO_REMITENTE, Map.of(
                        "name", nombreRemitente,
                        CAMPO_EMAIL, emailRemitente),
                "to", List.of(Map.of(CAMPO_EMAIL, destinatario)),
                CAMPO_ASUNTO, asunto,
                CAMPO_TEXTO, texto);

        restClient.post()
                .uri(URL_ENVIO)
                .header(CABECERA_API_KEY, apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(cuerpo)
                .retrieve()
                .toBodilessEntity();
    }
}
