# Integración y despliegue continuo de ESIBuy (CI/CD)

## 1. Objetivo

El objetivo de esta tarea es implementar un proceso de integración continua (CI) y despliegue continuo (CD) para ESIBuy, automatizando la compilación, las pruebas y la publicación de la aplicación.

Siguiendo las recomendaciones del profesor, la configuración se ha probado inicialmente sobre la rama `release/sprint2`, evitando realizar pruebas de integración y despliegue directamente en `main`.

Una vez validado el funcionamiento del proceso, se podrá incorporar la configuración definitiva a la rama principal del proyecto.

## 2. Tecnologías utilizadas

| Tecnología | Función |
|---|---|
| Git y GitHub | Control de versiones y gestión de Pull Requests |
| Azure Pipelines | Integración continua y ejecución de pruebas |
| GitHub Actions / CodeQL | Análisis de seguridad del código |
| Docker | Empaquetado y ejecución de la aplicación |
| Angular | Frontend de ESIBuy |
| Spring Boot 4 y Java 21 | Backend y API REST |
| MongoDB Atlas | Persistencia de datos e imágenes de productos |
| Render | Alojamiento y despliegue continuo de la aplicación |

## 3. Arquitectura del despliegue

ESIBuy se despliega como una única aplicación Docker que contiene el frontend Angular y el backend Spring Boot.

El archivo `Dockerfile`, situado en la raíz del repositorio, utiliza una construcción multietapa:

1. **Compilación del frontend:** se utiliza Node.js 24 para instalar las dependencias y generar la versión de producción de Angular.
2. **Compilación del backend:** se utiliza Maven con Java 21. Los archivos compilados de Angular se incorporan a los recursos estáticos de Spring Boot.
3. **Imagen de ejecución:** se utiliza una imagen de Java 21 JRE que ejecuta el JAR resultante.

De esta manera, Spring Boot sirve tanto la API REST como la aplicación Angular. No es necesario mantener un servidor independiente de Angular en Render.

El frontend utiliza rutas relativas para comunicarse con el backend, de modo que ambos comparten el mismo origen.

### Navegación y rutas Angular

Se ha incorporado `SpaController.java` para permitir acceder directamente a las rutas de Angular y recargarlas sin obtener errores 404.

También se ha adaptado la configuración de Spring Security para permitir las peticiones de navegación a las páginas HTML, manteniendo la autorización de los endpoints protegidos de la API.

Durante las pruebas se comprobó el funcionamiento de rutas como `/login`, `/vendedor`, `/vendedor/pedidos` y `/listas`.

### Persistencia de imágenes

Inicialmente, las imágenes de los productos se almacenaban en el sistema de archivos local.

Como el almacenamiento local del servicio gratuito de Render no es persistente, se implementó un sistema de almacenamiento en MongoDB Atlas.

Mediante la variable `APP_PRODUCTOS_IMAGENES_ALMACENAMIENTO`, la aplicación puede utilizar almacenamiento local o MongoDB.

En el despliegue de Render se utiliza el modo `mongo`, por lo que las imágenes nuevas se conservan aunque se reinicie el contenedor.

## 4. Integración continua con Azure Pipelines

El proyecto utiliza el archivo `azure-pipelines.yml` para definir el proceso de integración continua.

El pipeline se ejecuta al recibir cambios en las ramas configuradas y al abrir o actualizar las Pull Requests correspondientes, según la configuración de los disparadores.

Se ha añadido soporte para las ramas `release/*`, permitiendo validar los cambios dirigidos a `release/sprint2`.

Las comprobaciones incluyen:

- Compilación y ejecución de tests del backend con Maven.
- Compilación y ejecución de tests del frontend con Angular.
- Análisis de secretos mediante Gitleaks.
- Comprobación del resultado global del pipeline.

Adicionalmente, GitHub Actions ejecuta análisis de seguridad mediante CodeQL.

### Agente de ejecución

Azure Pipelines utiliza un agente autoalojado denominado `wsl-ubuntu`, perteneciente al grupo `Default`.

Este agente debe estar conectado para procesar los trabajos. Si el equipo que lo aloja está apagado o el agente está desconectado, las ejecuciones permanecen en cola.

Esta dependencia afecta a la disponibilidad de la integración continua, pero no al funcionamiento de ESIBuy una vez desplegada en Render.

### Diferencia entre CI y protección de ramas

La ejecución de los checks y la obligación de superarlos antes de hacer merge son mecanismos diferentes.

Azure Pipelines ejecuta las pruebas y publica sus resultados en GitHub. Para impedir que se fusionen cambios con comprobaciones pendientes o fallidas, es necesario disponer de reglas de protección de ramas con checks obligatorios.

La configuración de estas reglas debe ser revisada por el administrador del repositorio.

## 5. Configuración del despliegue en Render

Se ha creado un servicio web llamado `esibuy-sprint2`, conectado al repositorio de GitHub del proyecto.

La configuración utilizada es:

| Parámetro | Configuración |
|---|---|
| Nombre | `esibuy-sprint2` |
| Tipo de servicio | Web Service |
| Entorno | Docker |
| Rama | `release/sprint2` |
| Región | Frankfurt (EU Central) |
| Root Directory | Raíz del repositorio |
| Dockerfile Path | `./Dockerfile` |
| Plan | Free |
| Health Check Path | `/` |
| Auto-Deploy | `After CI Checks Pass` |

**URL del despliegue de pruebas:**

https://esibuy-sprint2.onrender.com

Render construye la imagen Docker a partir del código de la rama configurada y ejecuta el backend Spring Boot, que también sirve el frontend.

### Configuración HTTPS

Render proporciona HTTPS en la conexión pública y redirige internamente las peticiones al servidor HTTP del contenedor.

Por eso, en Render se desactiva el SSL interno de Spring Boot, manteniendo las cookies de sesión seguras para las conexiones HTTPS del navegador.

El despliegue no necesita incluir los certificados locales utilizados durante el desarrollo.

### Variables de entorno

Las variables necesarias se configuran en el panel de Render y no se incluyen en el repositorio.

| Variable | Finalidad |
|---|---|
| `PORT` | Puerto interno utilizado por Spring Boot |
| `SSL_ENABLED` | Controla el SSL interno del backend |
| `SESSION_COOKIE_SECURE` | Configura la marca Secure de las cookies |
| `LOG_FORMAT` | Opcional. Formato de los logs de la consola del servidor: `ecs` (JSON, por defecto) o `logstash`. Vacío en local para texto plano. Cada línea JSON lleva `correlationId`, usuario seudonimizado, IP, endpoint y User-Agent |
| `FRONTEND_ORIGIN` | Define el origen público permitido |
| `APP_PRODUCTOS_IMAGENES_ALMACENAMIENTO` | Selecciona MongoDB como almacenamiento de imágenes |
| `MONGODB_URI` | Cadena privada de conexión a MongoDB Atlas |
| `TOTP_ENCRYPTION_KEY` | Clave de cifrado de secretos TOTP |
| `IMAGENES_FIRMA_KEY` | **Obligatoria.** Clave Base64 de 32 bytes para firmar las URLs de las imágenes de producto (T-34). Sin ella el backend no arranca |
| `IMAGENES_FIRMA_TTL` | Opcional. Vigencia de las URLs firmadas (por defecto `2h`) |
| `PERSONAL_DATA_ENCRYPTION_KEY` | Clave Base64 de 32 bytes para cifrar DNI/NIF y teléfono de usuarios |
| `PERSONAL_DATA_PREVIOUS_ENCRYPTION_KEY` | Clave anterior temporal para leer/rotar campos cifrados |
| `PERSONAL_DATA_MIGRATE` | Activar temporalmente con `true` para cifrar los datos existentes al desplegar |
| `PERSONAL_DATA_ROTATE` | Activar temporalmente con `true` para rotar los campos cifrados a la clave actual |
| `TOTP_MIGRATE_KEY` | Control de migración de la clave TOTP |
| `JAVA_TOOL_OPTIONS` | Ajustes de memoria para la JVM |

Las credenciales, claves de cifrado y enlaces privados de despliegue deben mantenerse fuera de GitHub.
La migración de datos personales es optativa e idempotente: activarla en `true` durante un arranque,
comprobar en el log el mensaje de finalización y volver a desactivarla después.
Generar `PERSONAL_DATA_ENCRYPTION_KEY` con 32 bytes aleatorios codificados en Base64 y conservarla
en un gestor de secretos: perderla impide recuperar los datos cifrados.
Para rotar la clave, detener las demás instancias, configurar la clave nueva como
`PERSONAL_DATA_ENCRYPTION_KEY` y la anterior como `PERSONAL_DATA_PREVIOUS_ENCRYPTION_KEY`, activar
`PERSONAL_DATA_ROTATE=true` y arrancar una sola instancia. Tras confirmar el mensaje de finalización,
desactivar la rotación, quitar la clave anterior y reiniciar las instancias restantes con la nueva
clave. No activar a la vez `PERSONAL_DATA_MIGRATE` y `PERSONAL_DATA_ROTATE`.

### Acceso a MongoDB Atlas

Para que Spring Boot pudiera conectarse desde Render, se añadieron a la lista de acceso de MongoDB Atlas los rangos de direcciones de salida indicados en el panel del servicio.

De esta forma, se permitió la conexión desde Render sin autorizar indiscriminadamente todas las direcciones de Internet.

Los rangos deben revisarse si cambia la región, la configuración de red o la infraestructura del servicio.

## 6. Funcionamiento del despliegue continuo

Render se ha configurado con la opción `After CI Checks Pass`.

El flujo probado es el siguiente:

1. Se desarrolla un cambio en una rama `feature`.
2. Se abre una Pull Request hacia `release/sprint2`.
3. Azure Pipelines y GitHub Actions ejecutan las comprobaciones.
4. Una vez validadas, se fusiona la Pull Request.
5. El nuevo commit de `release/sprint2` activa otra ejecución de CI.
6. Render detecta el cambio y, tras las comprobaciones reconocidas, inicia automáticamente un nuevo despliegue.
7. La nueva versión queda disponible en la misma URL pública.

Esto permite automatizar la publicación sin ejecutar manualmente comandos de Docker ni iniciar los servidores desde los ordenadores de los desarrolladores.

La prueba realizada confirma el despliegue automático después de una ejecución correcta de CI. No se ha realizado todavía una prueba específica con un check fallido para verificar el bloqueo del despliegue en ese caso.

## 7. Pruebas realizadas

### 7.1. Construcción y ejecución local

Antes de desplegar, se construyó la imagen Docker y se ejecutó localmente.

Se comprobó que Spring Boot servía Angular, que el inicio de sesión funcionaba y que los endpoints protegidos mantenían sus restricciones de acceso.

También se ejecutaron correctamente los tests del backend y frontend.

### 7.2. Primera integración en release

Se creó la **Pull Request #30** desde `feature/CI-CD-Render` hacia `release/sprint2`.

La PR incorporaba la configuración Docker, los ajustes para Render, la persistencia de imágenes en MongoDB y los cambios integrados previamente desde `develop`.

Las comprobaciones de la PR terminaron correctamente.

Tras realizar el merge, Azure Pipelines ejecutó también las pruebas sobre el nuevo commit de `release/sprint2`.

Posteriormente se realizó el primer despliegue de ESIBuy en Render.

### 7.3. Validación de la aplicación pública

Una vez solucionada la conectividad con MongoDB Atlas, se comprobó el funcionamiento de:

- Acceso a la aplicación mediante HTTPS.
- Inicio de sesión como vendedor.
- Visualización del catálogo y de imágenes almacenadas en MongoDB.
- Recarga de páginas Angular sin errores 404.
- Acceso a la pantalla de pedidos del vendedor.
- Cierre de sesión y protección de rutas autenticadas.

Estas comprobaciones confirmaron el funcionamiento básico de la aplicación integrada en Render.

### 7.4. Prueba del despliegue automático

Se creó la **Pull Request #34** para comprobar el despliegue continuo mediante un cambio inocuo en `frontend/src/index.html`.

Los ocho checks de la PR terminaron correctamente.

Después del merge en `release/sprint2`, Azure Pipelines ejecutó las comprobaciones sobre el commit integrado.

Render detectó automáticamente el nuevo commit y realizó el despliegue sin utilizar la opción Manual Deploy.

| Evidencia | Identificador |
|---|---|
| PR de integración inicial | `#30` |
| PR de prueba de CD | `#34` |
| Pipeline posterior al segundo merge | `#20261104.12` |
| Commit desplegado automáticamente | `7357c728` |
| Resultado en Render | `Live` |
| Disparador en Render | `Auto-Deploy` |

Con esta prueba quedó demostrado el funcionamiento del despliegue automático sobre la rama de pruebas `release/sprint2`.

## 8. Limitaciones y consideraciones

### Agente autoalojado

El proceso de CI depende de la disponibilidad del agente `wsl-ubuntu`. Si permanece desconectado, los trabajos no pueden ejecutarse hasta que vuelva a conectarse.

### Plan gratuito de Render

La instancia gratuita puede suspenderse después de un período de inactividad. Al recibir una nueva visita, Render la reactiva automáticamente, lo que puede provocar una carga inicial más lenta.

La memoria disponible también es limitada, por lo que es importante vigilar el consumo del backend.

### Seguridad de credenciales

Se deben rotar las credenciales de MongoDB que hayan podido quedar expuestas durante las pruebas.

La rotación de la clave de cifrado TOTP requiere especial cuidado para conservar el acceso de los usuarios que ya tengan configurada la autenticación de dos factores.

### Validación de errores

Se ha comprobado el despliegue automático con los checks correctos, pero queda pendiente validar explícitamente que un fallo de CI impide publicar un nuevo commit.

### RGPD: exportación de los datos personales

- `GET /usuarios/mis-datos` (cualquier usuario autenticado) devuelve un JSON con los datos del **propio titular**; el usuario sale siempre de la sesión y no hay parámetros para pedir los de otro. Se entrega como adjunto (`Content-Disposition: attachment; filename="mis-datos.json"`) y con `Cache-Control: no-store`. En el perfil, el botón «Descargar mis datos» lo descarga.
- **Contenido:** cliente (perfil, cuenta, direcciones, métodos de pago enmascarados, pedidos, listas, carrito y valoraciones), vendedor (perfil, cuenta, productos, listas y los pedidos recibidos solo con sus propias líneas, **sin datos de los compradores**) y administrador (perfil y cuenta). DNI y teléfono se entregan **descifrados**, porque solo los recibe su titular.
- **Nunca se incluye:** hashes ni historial de contraseñas, secretos TOTP, códigos de respaldo, tokens ni el token del método de pago. El DTO es explícito (`ExportacionDatosResponse`), no la entidad.
- **Límite:** una exportación por minuto y usuario (persistente, con el mismo almacén que el resto de límites); si se supera, 429 con `Retry-After`. Se suma al límite general de la API.
- **Auditoría:** cada exportación genera el evento `exportacion_datos` (resultado `exito`, objetivo el identificador del usuario y detalle solo con el tipo de usuario).
- Sin configuración nueva.

### RGPD: política de privacidad, aviso legal y consentimiento

- **Documentos** (plantillas con los datos legales pendientes marcados como `[COMPLETAR: …]`) en `documents/rgpd/`: `politica-privacidad.md`, `aviso-legal.md`, `registro-actividades-tratamiento.md` y `politica-retencion.md`. Los destinatarios (MongoDB Atlas, Render, Brevo y VirusTotal si se activa) y los plazos técnicos (auditoría 365 días, sesiones, enlaces) están verificados contra el código. Antes de publicar hay que completar los datos del responsable y que el equipo revise los textos.
- **Páginas públicas** `/politica-privacidad` y `/aviso-legal` (Angular), enlazadas desde el registro, el login y la recuperación de contraseña. Su texto debe coincidir con los documentos.
- **Consentimiento:** el registro público de clientes y vendedores exige la casilla «He leído y acepto…» (no premarcada). El backend rechaza con 400 (`errores.aceptaPolitica`) una petición sin `aceptaPolitica: true` y guarda en el usuario `versionPoliticaAceptada` y `fechaAceptacionPolitica`.
- **Versión de la política:** constante `PoliticaPrivacidad.VERSION_ACTUAL` del backend (inicial `1.0`) y `version` de la página del frontend. Al cambiar el texto de forma sustancial se suben las dos y los documentos.
- Las cuentas anteriores y las de administrador no tienen versión ni fecha de aceptación (`null`): no se les pide aceptar de nuevo.

### URLs firmadas con caducidad para las imágenes

- Las respuestas que incluyen la imagen de un producto (catálogo, detalle, panel del vendedor, carrito, favoritos y listas) devuelven `/product-images/<nombre>?exp=<epoch>&sig=<firma>`. La firma es `HMAC-SHA256(nombre ":" expiración)` con `IMAGENES_FIRMA_KEY`. El único punto que la construye es `FirmaImagenService`.
- `FiltroImagenFirmada` protege `/product-images/**` en los dos modos de almacenamiento: sin firma o con firma inválida o manipulada responde **403**; con firma correcta pero caducada, **410**.
- La caducidad es `IMAGENES_FIRMA_TTL` (2 h por defecto) redondeada a la siguiente hora en punto, de modo que la URL es estable dentro de esa ventana y el navegador puede cachear la imagen.
- **Clave:** generar 32 bytes aleatorios en Base64 (por ejemplo, `openssl rand -base64 32`), configurarla en Render y en el `.env` local, y no versionarla. Si falta o no es válida, la aplicación no arranca. Cambiarla invalida las URLs ya emitidas hasta que el frontend las recarga.
- Una página abierta más tiempo que la vigencia muestra imágenes rotas hasta recargarla; los enlaces a una imagen copiados fuera de la aplicación dejan de funcionar.

### Antivirus (VirusTotal) y cabeceras de entrega de imágenes

- **Cabeceras de `/product-images/**`** (modo local y modo `mongo`): `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox` y `Content-Disposition: inline; filename="imagen"`. Están en `CabecerasEntregaImagen`. La CSP de la imagen sustituye a la global de la aplicación. No se añade `Cross-Origin-Resource-Policy: same-origin`, porque rompería la visualización en desarrollo (frontend en `:4200`, API en `:8443`).
- **VirusTotal** está desactivado por defecto. Para activarlo en Render:
  - `VIRUSTOTAL_ENABLED=true`
  - `VIRUSTOTAL_API_KEY=<clave>`: solo por variable de entorno, nunca en el repositorio.
  - `VIRUSTOTAL_FAIL_CLOSED=true` (valor por defecto).
- **Orden en la subida:** validaciones, recodificación (T-33) y análisis de VirusTotal con los bytes recodificados; si lo rechaza, no se guarda nada.
- **Tiempos:** cada subida sube el fichero y consulta el resultado hasta 30 veces cada 2 s, es decir, hasta **unos 60 s** de espera.
- **Cuota:** la API gratuita permite unas 4 consultas por minuto y 500 al día. Si se agota o VirusTotal no responde, con `fail-closed` **no se pueden subir imágenes** (compromiso asumido: se prefiere no aceptar una imagen sin analizar). Con `VIRUSTOTAL_FAIL_CLOSED=false` se aceptarían sin analizar.
- La decisión de activarlo en producción queda como pendiente manual del responsable del despliegue.

### Recodificación de las imágenes de producto

- Tras las validaciones (tamaño, firma, `Content-Type`, extensión y marca de fin) y **antes** de VirusTotal y del almacenamiento, `ProductoImagenService` decodifica la imagen y la vuelve a codificar con `ImageIO`. Lo que se analiza y se guarda (en disco o en MongoDB) son los bytes nuevos: no conservan EXIF, comentarios ni datos ocultos.
- Límites (constantes del servicio): **4000 px por lado**, 16 millones de píxeles y **10 s** para decodificar y recodificar. Las dimensiones se leen del encabezado antes de reservar memoria, para evitar «bombas de descompresión».
- PNG y GIF se reescriben con su formato; el JPEG se convierte a RGB (sin transparencia, fondo blanco) con calidad fija 0,85. Un JPEG en CMYK se rechaza.
- **GIF animado:** se rechaza («El GIF no puede ser animado.»); el GIF estático se acepta.
- Mejora opcional no implementada: aislar la decodificación en un proceso o contenedor aparte.

### Permisos finos (authorities) además de los roles

- El catálogo se declara **una sola vez** en `CatalogoPermisos` (rol → permisos). De él salen la jerarquía de roles de Spring Security (`ROLE_ADMIN` implica sus permisos, etc.) y las autoridades que se guardan en la sesión al iniciar sesión (el rol y sus permisos).
- Las operaciones de administración y de escritura exigen **el rol y el permiso concreto** (reglas en `SecurityConfiguration`); una ruta de administración sin permiso asignado exige al menos `ROLE_ADMIN`.

| Permiso | Rol | Operaciones que protege |
|---|---|---|
| `USUARIOS_CONSULTAR` | ADMIN | `GET /administrador/usuarios` y `/{id}` |
| `USUARIOS_MODIFICAR` | ADMIN | `PUT /administrador/usuarios/{id}` |
| `USUARIOS_BLOQUEAR` | ADMIN | `PATCH /administrador/usuarios/{id}/activar`, `/bloquear` y `/desbloquear` |
| `ADMINISTRADORES_GESTIONAR` | ADMIN | `POST /administrador/register` y `DELETE /administrador/{id}` |
| `PRODUCTOS_CONSULTAR` | ADMIN | `GET /administrador/productos` |
| `AUDITORIA_CONSULTAR` | ADMIN | `GET /administrador/auditoria` |
| `CATEGORIAS_GESTIONAR` | ADMIN | `POST`, `PUT` y `DELETE` de `/categorias` |
| `CATEGORIAS_CONSULTAR` | ADMIN, VENDEDOR | `GET /categorias` |
| `PRODUCTOS_GESTIONAR` | VENDEDOR | `POST`, `PUT`, `PATCH` y `DELETE` de `/vendedor/productos` |
| `PEDIDOS_VENDEDOR_GESTIONAR` | VENDEDOR | `/vendedor/pedidos/**` |

- El rol `CLIENTE` no tiene permisos finos: sus operaciones dependen de que el dato sea suyo, y el propietario sale siempre de la sesión.
- **Cambios del catálogo y sesiones abiertas:** como la sesión guarda los permisos, un cambio del catálogo no alcanza a las sesiones ya abiertas hasta que caducan (como máximo, el límite absoluto de 8 horas).
- Para añadir un permiso: declararlo en `CatalogoPermisos`, asignarlo a su rol y exigirlo en la regla de la ruta en `SecurityConfiguration`.

### Content-Security-Policy y cabeceras de seguridad

- Todas las respuestas (HTML de Angular y API) llevan `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Además `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` sin cámara, micrófono, geolocalización ni pagos.
- Por qué cada excepción: `style-src 'unsafe-inline'` lo necesita Angular para los estilos de componente; `img-src data:` es el QR del TOTP y `https:` las imágenes de perfil, que son URL HTTPS externas por diseño; `font-src https://fonts.gstatic.com` sirve los ficheros de la tipografía (Google Fonts).
- **Modo de solo informe:** `app.security.csp.report-only=true` (en Render, la variable de entorno `APP_SECURITY_CSP_REPORT_ONLY=true`) emite `Content-Security-Policy-Report-Only`: no bloquea, solo avisa en la consola del navegador. Útil para revisar violaciones tras un cambio del frontend. Por defecto es `false` (la política bloquea).
- **Angular en producción:** `angular.json` tiene `optimization.styles.inlineCritical: false`. Con la opción por defecto Angular añade al `index.html` un `<script>` en línea (la técnica de «critical CSS») que la política bloquearía y la página saldría sin estilos. No lo reactives sin revisar la política.
- En desarrollo con `ng serve` (puerto 4200) el HTML no pasa por el backend y no lleva la cabecera; solo la prueba con la aplicación empaquetada.

### Verificación del correo en el alta

- Tras un registro público (cliente o vendedor) nuevo se envía un correo con un enlace `/verificar-correo?token=…`, de **un solo uso y 24 horas** de validez. El token solo se guarda como SHA-256 (colección `tokens_verificacion_correo`, con índice TTL).
- Para entrar hace falta **estar activada por un administrador y tener el correo verificado**: la verificación complementa la activación, no la sustituye. Con las credenciales correctas y el correo sin verificar, el login responde 403 con un mensaje claro.
- Si el correo ya estaba registrado no se envía nada y la respuesta sigue siendo el mismo `202`.
- **Cuentas existentes:** no tienen el campo `correoVerificado` y se consideran verificadas; no se bloquea a nadie.
- **Enlace perdido o caducado:** completar una recuperación de contraseña también marca el correo como verificado (abrir ese enlace demuestra que el buzón es del titular). No hay endpoint de reenvío.
- Requiere Brevo configurado (`BREVO_API_KEY`, `BREVO_FROM_EMAIL`), igual que la recuperación y el tercer factor. La URL del enlace usa `APP_FRONTEND_URL`.

### Límites de peticiones

- **API general:** 60 peticiones por minuto por usuario autenticado o, si es anónimo, por IP. Si se supera, 429 con `Retry-After`. Quedan fuera `OPTIONS`, `/usuarios/csrf`, `/usuarios/sesion-actual` y `/product-images/**`. Propiedades: `app.security.rate-limit.api.max-requests` y `app.security.rate-limit.api.window-seconds`.
- **Limitación conocida:** este contador está **en memoria y es por instancia**: si Render ejecuta varias réplicas, el límite efectivo se multiplica, y se reinicia al reiniciar. Se hace así para no escribir en MongoDB en cada petición. Varios usuarios anónimos detrás de la misma IP (red de una universidad, por ejemplo) comparten cupo.
- **Envío de códigos por correo (OTP):** 3 por hora y 10 por día por correo, además de los 3 por reto. Es persistente (MongoDB), válido con varias instancias. Propiedades: `app.security.rate-limit.otp.per-hour` y `app.security.rate-limit.otp.per-day`.
- **Altas públicas** (`POST /cliente/register` y `POST /vendedor/register`): 5 por IP cada 15 minutos, persistente en MongoDB (válido con varias instancias). Al superarlo, 429 con `Retry-After`; la respuesta de los registros válidos sigue siendo el `202` uniforme. Propiedades: `app.security.rate-limit.registro.max-requests` y `app.security.rate-limit.registro.window-seconds`. Cuenta por IP, no por correo, así que no revela si un correo existe, y solo cuentan las peticiones con token CSRF válido. Estas dos rutas **ya no están excluidas de CSRF**: el frontend pide `GET /usuarios/csrf` antes de enviar el formulario; un cliente externo que registre usuarios debe hacer lo mismo.
- **IP real detrás de Render:** `server.forward-headers-strategy=native` hace que la IP del cliente sea la original y no la del proxy. Para comprobarlo en el despliegue, haz una petición con `curl -i` y mira el campo `ip` de la línea de log JSON de esa petición (debe ser la tuya, no una IP interna de Render).

### Caducidad de contraseñas

- Una contraseña caduca a los **30 días** de su último cambio (`app.security.password.max-age`, por defecto `30d`; admite otros valores como `90d`). No requiere variable de entorno.
- Quien intenta entrar con una contraseña caducada (credenciales correctas) recibe un 403 con el código `CONTRASENA_CADUCADA` y el login le ofrece restablecerla por correo desde «He olvidado mi contraseña». No cuenta como intento fallido y queda auditado (`login_rechazado`).
- La fecha (`contrasenaCambiadaEn`) se guarda en el alta, en el cambio de contraseña y en la recuperación.
- **Cuentas existentes:** no tienen fecha. En su **primer inicio de sesión correcto tras el despliegue** se fija a esa hora y empiezan a contar entonces, por lo que no se bloquean todas a la vez: cada cuenta caduca 30 días después de su primer acceso posterior al despliegue.

### Registro de auditoría de seguridad

- Las acciones sensibles (login correcto, fallido y bloqueado, alta y baja de TOTP y del código por correo, administración de usuarios, alta y baja de cuentas, recuperación de contraseña) se guardan en la colección `auditoria` de MongoDB y también se escriben en el log.
- Cada registro contiene fecha, tipo, resultado, actor seudonimizado (HMAC con el pepper), objetivo (identificador interno), IP y `correlationId`. No contiene correos, contraseñas, códigos ni tokens.
- **Retención: 12 meses.** La aplica un índice TTL (`app.auditoria.retencion=365d`, en `application.properties`). El índice se crea al arrancar por primera vez; si se cambia la retención con la colección ya creada, hay que recrear ese índice en Atlas.
- **Consulta:** `GET /administrador/auditoria?pagina=0&tamano=20` (solo `ADMIN`, tamaño máximo 100). La API no ofrece ninguna operación para modificar o borrar registros.
- **Limitación conocida:** el usuario de MongoDB que usa la aplicación conserva permisos de escritura sobre toda la base de datos, así que a nivel de base de datos podría borrar o modificar registros. Restringirlo (un rol que solo permita insertar y consultar `auditoria`) corresponde a la tarea T-28, que lleva otro miembro del equipo.

## 9. Integración definitiva y versionado

Durante el desarrollo del Sprint 2, se ha utilizado la rama `release/sprint2` para realizar las pruebas de integración y despliegue continuo sin afectar a `main`.

Una vez comprobado que el proceso funciona correctamente, se ha consultado al profesor sobre la configuración definitiva. Su recomendación es que, al finalizar el Sprint 2, el despliegue automático se realice desde `main`, utilizando la última versión cerrada y etiquetada del proyecto.

Por tanto, el procedimiento previsto es:

1. Finalizar las historias de usuario e integrarlas en `develop`.
2. Incorporar los cambios a `release/sprint2` y validar la aplicación.
3. Fusionar la versión aprobada en `main` mediante una Pull Request.
4. Crear la etiqueta correspondiente a la versión definitiva del Sprint 2, siguiendo el criterio utilizado en Sprint 1 con `v1.0.0`.
5. Adaptar la configuración de CI/CD para que Render despliegue automáticamente la versión validada de `main`.

De esta forma, `release/sprint2` se utiliza para las pruebas y `main` queda como referencia de las versiones oficiales del proyecto.

**Nota técnica:** el despliegue automático basado en commits de `main` no se activa necesariamente al crear una etiqueta Git. Si se requiere que sea la creación del tag la que desencadene el despliegue, será necesario configurar explícitamente ese disparador.

## 10. Conclusión

Se ha implementado y probado un proceso de integración y despliegue continuo para ESIBuy utilizando GitHub, Azure Pipelines, Docker y Render.

El sistema permite compilar y validar automáticamente los cambios y publicar nuevas versiones desde `release/sprint2` sin tener que ejecutar manualmente los servidores de desarrollo.

También se ha comprobado el acceso público a la aplicación mediante HTTPS, su conexión con MongoDB Atlas, la autenticación de usuarios y la persistencia de imágenes.

El proceso queda preparado como base para la integración definitiva de CI/CD en `main`, una vez completada y validada la entrega del Sprint 2.