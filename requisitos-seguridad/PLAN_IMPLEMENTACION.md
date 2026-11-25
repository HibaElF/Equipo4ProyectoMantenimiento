# Plan de implementación de las tareas de seguridad – ESIBuy

> Documento de trabajo para el chat de implementación. Cubre las **23 tareas aceptadas** de `requisitos-seguridad/Tareas_HdU_Seguridad-aceptadas.docx`. Las demás tareas de la auditoría (T-01 a T-04, T-14 a T-17, T-28, T-29, T-31, T-32, T-36 y T-37) las llevan otros miembros del equipo y **no se tocan aquí**.
>
> - Contexto del proyecto: `requisitos-seguridad/contexto/CONTEXTO_PROYECTO.md`
> - Reglas de trabajo: `requisitos-seguridad/contexto/REGLAS_DE_TRABAJO.md`
> - Seguimiento: `requisitos-seguridad/PROGRESO.md`
> - Auditoría original (solo consulta, es larga): `auditoria/primera_auditoria/resultado-auditoria.md`

## 0. Cómo usar este plan

1. Trabaja **una fase cada vez** y, dentro de la fase, **una tarea cada vez**, en el orden indicado (el orden respeta las dependencias).
2. El código ha cambiado desde la auditoría (commit `9a8f5a7`): se han añadido pago premium, estados de pedido, stock y baja de cliente. **No te fíes de los números de línea**; localiza siempre por clase y método con `Grep` y comprueba el estado real antes de editar.
3. Para cada tarea: lee su bloque, verifica el punto de partida, propón un plan breve, espera el visto bueno, implementa con pruebas y cierra con la skill `cerrar-tarea-seguridad`.
4. Donde el bloque dice **«Preguntar al usuario»**, no decidas por tu cuenta: es una decisión de negocio o requiere un dato que no está en el repositorio.
5. Las acciones marcadas como **manuales** (Atlas, Sonar, Render, GitHub) las hace el usuario; tú solo las describes y pides confirmación.

## 1. Mapa de fases

| Fase | Nombre | Tareas | Objetivo |
|---|---|---|---|
| 0 | Preparación y línea base | — | Entorno listo y estado de pruebas medido antes de tocar nada |
| 1 | Secretos y cambios rápidos | T-08, T-07 | Cerrar la fuga de secretos y los arreglos pequeños e independientes |
| 2 | Observabilidad y errores | T-18, T-20, T-19 | Base común de logs, errores y auditoría que usan las fases siguientes |
| 3 | Contraseñas y sesión | T-05, T-13, T-06, T-09 | Ciclo de vida de la contraseña y de la sesión |
| 4 | Abuso y entrada de datos | T-22, T-11, T-10, T-12 | Límites de peticiones, validación y registro protegido |
| 5 | Endurecimiento HTTP y permisos | T-21, T-23 | CSP y permisos finos |
| 6 | Imágenes | T-33, T-35, T-34 | Subida y entrega segura de imágenes |
| 7 | Privacidad y avisos de seguridad | T-24, T-25, T-27 | RGPD y empuje a activar el segundo factor |
| 8 | Documentación y cierre | T-26 + verificación final | Trazabilidad BP/28 y comprobación global |

**Dependencias entre tareas:** T-06 depende de T-05; T-09 de T-18 y T-19; T-13 comparte lógica con T-05; T-10 reutiliza el mecanismo de T-22; T-19 y T-20 aprovechan el `correlationId` de T-18; T-24 modifica los DTO de registro y va después de T-11, T-10 y T-12; T-34 va después de T-33 y T-35.

## 2. Coordinación con las tareas de otros miembros

Otros miembros trabajan en paralelo en estas tareas, que tocan ficheros comunes. Antes de editar un fichero de la tabla, haz `git fetch` y revisa `git log origin/Develop -- <fichero>`. Haz commits pequeños y evita reformatear ficheros enteros.

| Fichero o zona | Nuestras tareas | Tareas de otros | Riesgo |
|---|---|---|---|
| `PerfilController`, `PerfilService`, `ModificarUsuarioRequest` | T-05, T-13, T-25, T-27 | T-04 | Conflicto de lógica y de pruebas |
| `ClienteController`, `ClienteService` | T-10, T-11, T-24 | T-16 (código no usado) | Constructores «para tests» que T-16 puede borrar |
| `AdministradorController`, `AdministradorService` | T-19, T-23 | T-03 | Conflicto en el mismo controlador |
| `application.properties` | T-18, T-06, T-22, T-35, T-34 | T-28, T-29 | Conflicto de edición |
| `SecurityConfiguration` | T-10, T-18, T-21, T-22, T-23 | — | Es el fichero más tocado por nosotros: cambios pequeños y ordenados |

## 3. Reglas comunes a todas las tareas

- **Pruebas:** cada cambio de comportamiento lleva pruebas nuevas o actualizadas (convenciones en la skill `pruebas-esibuy`). No se da una tarea por hecha con pruebas en rojo.
- **Datos personales:** ningún log, mensaje de error ni auditoría contiene contraseñas, códigos, tokens ni correos en claro. Usa identificadores seudonimizados.
- **Mensajes anti-enumeración:** no cambies las respuestas uniformes (`202` del registro, respuesta única de la recuperación y del login) de forma que revelen si un correo existe.
- **Secretos:** claves y credenciales solo por variables de entorno (nombres en `CONTEXTO_PROYECTO.md`). Antes de cerrar cada tarea, aplica la skill `comprobar-secretos`.
- **Frontend:** si una tarea cambia una API o un formulario, actualiza el servicio y la pantalla de Angular y sus `.spec.ts`. Los `.spec.ts` solo pueden ejecutarse con Node ≥ 22.22.3 (ver contexto).

---

## Fase 0 – Preparación y línea base

No es una tarea de la auditoría, pero es obligatoria antes de la Fase 1.

**Pasos**

1. Lee `CONTEXTO_PROYECTO.md` y `REGLAS_DE_TRABAJO.md`. Confirma la rama actual con `git status` y `git branch --show-current`; no cambies de rama sin permiso.
2. Comprueba el entorno e informa al usuario: `java -version` (el proyecto compila a Java 21; el equipo puede tener una versión superior), `node -v` (para las pruebas del frontend hace falta ≥ 22.22.3), `docker --version` (lo usan Gitleaks y Semgrep).
3. Mide la línea base del backend, desde `Proyecto_ISO_2627-main/backend`:

   ```bash
   ./mvnw -B clean verify -Dtest='!BackendApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false
   ```

   En el commit auditado (`9a8f5a7`) daba 1197 pruebas, 0 fallos, 14 omitidas y 89,9 % de líneas en JaCoCo. Ahora habrá más. Anota los números reales en `PROGRESO.md` (sección «Línea base»). Si hay fallos previos, **no los arregles**: avisa al usuario.
4. Si Node es suficiente, mide también la línea base del frontend (`npm ci` y `npm test -- --watch=false --coverage` en `Proyecto_ISO_2627-main/frontend`). Si no lo es, dilo y sigue solo con el backend.
5. Revisa qué ha cambiado desde la auditoría: `git diff --stat 9a8f5a7 HEAD -- Proyecto_ISO_2627-main | tail`.

**Salida de la fase:** línea base anotada en `PROGRESO.md` y entorno confirmado por el usuario.

---

## Fase 1 – Secretos y cambios rápidos

### T-08 · Respuesta de login en tiempo constante

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-05 (criterio «Comparación en tiempo constante») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** En AuthService.autenticar, si el usuario no existe el cortocircuito de la condición evita ejecutar passwordEncoder.matches (bcrypt de coste 12). El login con un correo inexistente responde antes que con uno registrado, lo que permite enumerar cuentas midiendo el tiempo.

**Descripción de la tarea:** Como responsable de seguridad, quiero que el login tarde lo mismo exista o no el correo, para impedir la enumeración de usuarios por tiempo de respuesta.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/services/AuthService.java`
- `backend/…/config/SecurityConfiguration.java`

**Punto de partida:** en `AuthService.autenticar`, la condición `usuario == null || usuario.getContrasenaHash() == null || !passwordEncoder.matches(...)` hace cortocircuito: si el usuario no existe no se ejecuta bcrypt (coste 12) y la respuesta es mucho más rápida.

**Diseño**

- Calcular **un hash señuelo** con el mismo `PasswordEncoder` (`PepperedBCryptPasswordEncoder`) y, cuando el usuario no exista o no tenga hash, ejecutar `passwordEncoder.matches(contrasena, hashSenuelo)` y descartar el resultado antes de lanzar el fallo.
- El señuelo debe tener el mismo formato que un hash real (`{bcrypt-pepper-v1}…`); si no, `matches` lo trata como bcrypt sin pepper y el coste cambia. Genéralo con `passwordEncoder.encode(...)`.
- Calcúlalo de forma **perezosa** (primer uso) para no romper `AuthServiceTests`, que construye `new AuthService(...)` con un `PasswordEncoder` simulado cuyo `encode` devuelve `null`. Así no cambias la firma del constructor.

**Pasos**

1. Añadir en `AuthService` un campo para el señuelo y un método privado `hashSenuelo()` que lo cree la primera vez (sincronizado o con inicialización segura).
2. Reestructurar la condición: primero obtener `usuario`; si es `null` o sin hash, hacer el `matches` contra el señuelo; después decidir el fallo con un único camino (`registrarFallo`, auditoría, `LoginRateLimitException` o `BadCredentialsException`).
3. No cambies los mensajes ni los códigos de respuesta.

**Pruebas:** ampliar `AuthServiceTests`: con correo inexistente se invoca `passwordEncoder.matches` (verificación con Mockito), el mensaje es el mismo y el contador de fallos se actualiza. No añadas una prueba de tiempos reales (es inestable); la medición con 100 intentos se hace a mano.

**Preguntar al usuario:** nada.

**Criterios de aceptación**

- [ ] Con un correo inexistente también se ejecuta una comprobación bcrypt (prueba unitaria que lo verifica).
- [ ] El mensaje y el código de respuesta son idénticos para correo inexistente y contraseña incorrecta.
- [ ] La diferencia media de tiempo entre ambos casos es despreciable (por ejemplo menor del 10 % en 100 intentos).
- [ ] El rate limiting existente se mantiene.

### T-07 · Datos personales en la contraseña nueva de la recuperación

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-05 (criterio «La contraseña no contiene datos personales») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** En el registro PasswordPolicy recibe nombre, apellidos, correo, fecha de nacimiento, teléfono y DNI, pero RecuperacionContrasenaService.completar llama a passwordPolicy.validate(nuevaContrasena) sin datos personales, de modo que al restablecer se puede elegir una contraseña con el nombre o el DNI.

**Descripción de la tarea:** Como responsable de seguridad, quiero que las contraseñas restablecidas cumplan la misma política que las del registro, para que no se puedan eludir las reglas con el flujo de recuperación.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/services/RecuperacionContrasenaService.java`
- `backend/…/services/PasswordPolicy.java`

**Punto de partida:** `RecuperacionContrasenaService.completar` llama a `passwordPolicy.validate(nuevaContrasena)` **sin** datos personales. En el registro sí se pasan: `ClienteService.registrar` (nombre, apellidos, correo, fecha de nacimiento con formato `ddMMyyyy`, teléfono y DNI), `VendedorService.registrar` (además el nombre comercial en lugar de la fecha) y `AdministradorService.registrar` (nombre, apellidos y correo).

**Diseño:** una función única que, dado un `Usuario`, devuelva la lista de datos personales según su tipo, para reutilizarla en T-05 (cambio de contraseña). Ubicación sugerida: un método estático en `PasswordPolicy` o una clase pequeña en `services`.

**Pasos**

1. Crear el método `datosPersonalesDe(Usuario)` con la misma lógica que el registro (mismo formato de fecha, sin valores nulos ni vacíos).
2. En `completar`, sustituir la llamada por `passwordPolicy.validate(nuevaContrasena, datosPersonalesDe(usuario))`. El usuario ya está cargado antes de validar.
3. Mantener el mismo mensaje de error que el registro (`InvalidRegistrationException`).

**Pruebas:** ampliar `RecuperacionContrasenaServiceTests` con un caso por dato (nombre, apellido, parte del correo, teléfono, DNI) y por tipo de usuario; y un caso válido que siga funcionando. Los teléfonos y DNI se descifran de forma transparente al leer el usuario (conversor de Mongo), pero en las pruebas con simulados se asignan directamente.

**Criterios de aceptación**

- [ ] Restablecer con una contraseña que contiene nombre, apellidos, parte del correo, teléfono o DNI devuelve 400 con el mismo mensaje que el registro.
- [ ] Una contraseña válida sigue funcionando.
- [ ] Hay una prueba por cada tipo de dato personal y por tipo de usuario (cliente, vendedor, administrador).

---

## Fase 2 – Observabilidad y errores

El orden es **T-18 → T-20 → T-19**: los logs con contexto dan el `correlationId` que usan los errores y la auditoría.

### T-18 · Logs estructurados (JSON) con contexto y correlationId

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (criterio «Logs estructurados») |
| Estado de partida | No implementado |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** Los logs son texto plano con el formato por defecto de Spring Boot. Buscado logback, logstash, MDC., correlation y structured en backend/src/main y pom.xml: sin resultados. Los eventos de AuditoriaService no incluyen usuario, IP, endpoint ni User-Agent.

**Descripción de la tarea:** Como equipo de operación, queremos logs en JSON con contexto y un identificador de correlación, para poder investigar incidentes de seguridad sin exponer datos personales.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/src/main/resources/application.properties`
- `backend/…/security/ (nuevo filtro de contexto)`
- `backend/…/services/AuditoriaService.java`

**Punto de partida:** no hay configuración de logging (formato por defecto de Spring Boot), ni MDC ni `correlationId`. `AuditoriaService` escribe líneas `evento_seguridad=…` en texto plano. `AsyncConfiguration` solo activa `@EnableAsync` con el ejecutor por defecto.

**Diseño**

- **Formato JSON:** usar el soporte de logging estructurado de Spring Boot (`logging.structured.format.console`, con formato `ecs` o `logstash`). Si el formato elegido no está soportado en la versión instalada (Spring Boot 4.1), verifica la propiedad en la documentación antes de usarla.
- **Filtro de contexto** (`OncePerRequestFilter`) dentro de la cadena de seguridad, tras `SecurityContextHolderFilter`, que:
  - toma `X-Correlation-Id` de la petición solo si cumple un patrón estricto (por ejemplo `[A-Za-z0-9-]{8,64}`); si no, genera un UUID;
  - lo devuelve en la cabecera de la respuesta;
  - rellena el MDC con `correlationId`, `ip` (`request.getRemoteAddr()`), `userAgent` (truncado y sin caracteres de control, para evitar inyección en logs), `metodo`, `endpoint` (solo la ruta, sin parámetros) y `usuario` **seudonimizado**;
  - limpia el MDC en un `finally`.
- **Seudonimización:** crear una utilidad (HMAC-SHA256 con el pepper, igual que hace `LoginAttemptStore.fingerprint`, que es privada) para obtener un identificador estable sin exponer el correo. La reutilizarán T-19, T-09 y T-25.
- **Hilos asíncronos:** el MDC no pasa a los hilos de `@Async` (envío de correos). Configurar un `TaskDecorator` que copie el MDC al ejecutor (en Spring Boot hay un personalizador de `ThreadPoolTaskExecutor`; comprueba su paquete en Spring Boot 4).
- **Entorno local:** los logs JSON son poco legibles; permite sobrescribir el formato con una variable (`${LOG_FORMAT:...}`) y documéntalo.

**Pasos**

1. Crear el filtro y registrarlo en `SecurityConfiguration` (`addFilterAfter(..., SecurityContextHolderFilter.class)`).
2. Añadir las propiedades de logging estructurado a `application.properties`.
3. Crear la utilidad de seudonimización y el decorador de tareas.
4. Revisar los `LOGGER.*` existentes (`BrevoEmailService`, `RespuestasTercerFactor`, `BajaUsuarioService`, `ProductoService`…) para asegurar que ninguno escribe correos, tokens o contraseñas.
5. Que las respuestas de error incluyan el `correlationId` queda para T-20.

**Pruebas**

- Prueba unitaria del filtro con `MockHttpServletRequest`: dentro del `FilterChain` simulado se lee el MDC y se comprueba que están las claves, que el `User-Agent` se sanea y que el MDC queda vacío al terminar.
- Prueba del patrón de `X-Correlation-Id` (válido y malicioso).
- Prueba de propiedades en la línea de `ConfiguracionHttpsTests` (lee `application.properties`) que compruebe el formato estructurado.

**Verificación manual:** arrancar la aplicación y comprobar que una línea de log es JSON con los campos esperados; hacer una petición con `curl -i` y ver `X-Correlation-Id` en la respuesta.

**Criterios de aceptación**

- [ ] Cada línea de log es JSON con marca de tiempo, nivel, mensaje, correlationId, usuario seudonimizado, IP, endpoint, User-Agent y causa.
- [ ] Las respuestas incluyen la cabecera X-Correlation-Id.
- [ ] Ningún log contiene contraseñas, códigos, tokens ni correos en claro.
- [ ] Hay una prueba que verifica que el MDC se rellena.

### T-20 · Gestión genérica de errores sin detalles internos

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (criterio «Errores genéricos al cliente») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | T-18 (para incluir el correlationId) |

**Por qué está pendiente (auditoría):** RegistrationExceptionHandler.handleInvalidQuery devuelve al cliente el mensaje de cualquier IllegalArgumentException, incluidas las lanzadas por librerías, y no hay un manejador general de Exception. Buscado @ExceptionHandler(Exception.class), RuntimeException.class y Throwable.class: sin resultados.

**Descripción de la tarea:** Como responsable de seguridad, quiero que ningún error devuelva detalles internos al cliente, para no facilitar información útil a un atacante.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/controllers/RegistrationExceptionHandler.java`
- `backend/…/exceptions/ (nueva excepción)`
- `backend/…/services/AdministradorService.java, DatosRolUsuario.java, TotpService.java y ProductoImagenService.java`

**Punto de partida:** `RegistrationExceptionHandler` (global) tiene un `@ExceptionHandler(IllegalArgumentException.class)` que devuelve `exception.getMessage()` al cliente para **cualquier** `IllegalArgumentException`, también las de librerías. No hay manejador de `Exception`. Hay unos **76** `new IllegalArgumentException(...)` en el código principal (25 ficheros: servicios, DAO, modelo…), muchos con mensajes pensados para el usuario, y muchas pruebas hacen `assertThrows(IllegalArgumentException.class, …)`.

**Diseño**

- Crear `DatosNoValidosException extends IllegalArgumentException`: así las pruebas actuales siguen pasando. Será la excepción de «mensaje apto para el usuario».
- Manejadores en un `@RestControllerAdvice` global:
  - `DatosNoValidosException` → 400 con su mensaje;
  - `IllegalArgumentException` genérica → 400 con **mensaje fijo** y la causa al log;
  - `Exception` → 500 con mensaje genérico y `correlationId`, causa al log.
- **Trampas a evitar:**
  - un manejador de `Exception` captura también `AccessDeniedException` (lanzada por `@PreAuthorize`) y la convertiría en 500; debe volver a lanzarse (`throw`) o excluirse para que Spring Security la responda con 403 (`MetodoPagoController` ya tiene un manejador local de `AccessDeniedException`; los manejadores locales tienen prioridad);
  - respeta las excepciones propias de Spring MVC (cuerpo ilegible → 400, método no permitido → 405, recurso no encontrado → 404): extiende `ResponseEntityExceptionHandler` o mapea esos casos explícitamente;
  - ordena el `@RestControllerAdvice` con prioridad baja para que los manejadores específicos ganen.
- Migrar los `throw new IllegalArgumentException(` **con mensaje para el usuario** a `DatosNoValidosException`, revisando uno a uno; los que indican errores de programación o de librería se quedan como están.

**Pasos**

1. Listar las 76 apariciones y clasificarlas (mensaje de usuario / error interno). Muéstrale la clasificación al usuario antes de migrar.
2. Crear la excepción y el manejador; migrar por paquetes (servicios primero) ejecutando las pruebas tras cada bloque.
3. Añadir el `correlationId` (MDC de T-18) al cuerpo de los errores 500.
4. Comprobar el frontend: los mensajes que muestra salen del cuerpo `ApiErrorResponse`; no deben cambiar para los errores de validación.

**Pruebas:** `@WebMvcTest` con un controlador de prueba que lance cada tipo de excepción y compruebe código y cuerpo (sin traza, sin nombres de clase); caso de `AccessDeniedException` que siga devolviendo 403; casos 400/401/403/404/409/429/5xx.

**Criterios de aceptación**

- [ ] Una excepción inesperada devuelve 500 con un mensaje genérico y correlationId, sin traza, nombres de clase, tablas ni versiones.
- [ ] Los errores de validación propios siguen mostrando su mensaje al usuario y el frontend no sufre regresiones.
- [ ] Hay pruebas del mapeo a 400, 401, 403, 404, 409, 429 y 5xx.

### T-19 · Auditoría de seguridad ampliada y protegida

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 y criterio «Registros de auditoría securizados» |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | T-18 |

**Por qué está pendiente (auditoría):** AuditoriaService solo registra algunos eventos (baja de cuenta, login fallido y bloqueado, alta y eliminación de administradores, recuperación) en la salida estándar. No se registran el login correcto, los cambios de 2FA/3FA, los bloqueos hechos por administradores ni las modificaciones de usuarios, y los registros no se persisten ni se protegen.

**Descripción de la tarea:** Como responsable de seguridad, quiero un registro de auditoría completo e íntegro de las acciones sensibles, para poder detectar y demostrar usos indebidos.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/services/AuditoriaService.java`
- `backend/…/controllers/AdministradorController.java y AuthController.java`
- `backend/…/dao/ (nuevo repositorio de auditoría)`

**Punto de partida:** `AuditoriaService` solo escribe a log los eventos `cuenta_eliminada`, `login_fallido`, `login_bloqueado`, `alta_administrador`, `usuario_eliminado_por_administrador`, `recuperacion_solicitada` y `contrasena_restablecida`.

**Diseño**

- **Modelo y almacén:** documento `EventoAuditoria` (colección propia con índice TTL para la retención) y un almacén que solo **inserta** (usa `MongoTemplate.insert`; no extiendas `MongoRepository`, que expone el borrado). Campos: fecha, tipo, resultado, actor seudonimizado, objetivo, IP y `correlationId` (del MDC de T-18) y detalles sin datos personales.
- **Eventos nuevos:** login correcto (`AuthController.completarAutenticacion`), alta/baja de TOTP y de código por correo (`TotpService`, `PerfilService`), bloqueo/desbloqueo/activación y modificación de usuarios (`AdministradorService`), cambio de contraseña (T-05) y bloqueo de cuenta por intentos (T-09).
- **Integridad (opcional):** HMAC por evento con una clave de entorno. Pregunta si se quiere en esta fase.
- **Consulta:** `GET` paginado solo para `ADMIN` bajo `/administrador/**` (la ruta ya exige ese rol).
- **Fallos de escritura:** no deben romper la operación de negocio; se registran como error en el log.
- **Limitación conocida:** el usuario de MongoDB de la aplicación sigue pudiendo borrar (eso lo trata T-28, que llevan otros); documéntalo.

**Pasos**

1. Crear modelo, almacén y servicio; mantener los métodos actuales de `AuditoriaService` y que además persistan el evento.
2. Añadir los eventos nuevos llamando al servicio desde los puntos indicados.
3. Endpoint de consulta y, si el usuario lo quiere, una pantalla mínima de administración.
4. Documentar la retención elegida (por defecto, propón 12 meses y pregunta).

**Pruebas:** `AuditoriaServiceTests` ampliado; una prueba por evento nuevo (que se invoca con los datos esperados y sin datos personales); prueba de seguridad del endpoint (solo ADMIN).

**Preguntar al usuario:** retención en meses; si quiere firma HMAC; si quiere pantalla de consulta.

**Criterios de aceptación**

- [ ] Cada evento listado genera un registro con fecha, actor, acción, objetivo, resultado, IP y correlationId.
- [ ] El usuario de la aplicación no puede modificar ni borrar registros de auditoría.
- [ ] La consulta de auditoría solo está disponible para ADMIN.
- [ ] La política de retención está documentada y no hay datos personales en claro.

---

## Fase 3 – Contraseñas y sesión

El orden es **T-05 → T-13 → T-06 → T-09**.

### T-05 · Cambio de contraseña del usuario autenticado

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-05 (política de contraseñas) y criterio «Rotación del ID de sesión al cambiar credenciales» |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** No existe el cambio de contraseña con la sesión iniciada: la única vía es la recuperación por correo (el propio perfil indica que la contraseña se gestiona fuera de esa pantalla). Sin esta funcionalidad no puede cumplirse la rotación de sesión al cambiar credenciales ni forzar la renovación periódica.

**Descripción de la tarea:** Como usuario, quiero cambiar mi contraseña desde mi perfil, para renovarla cuando lo considere necesario sin depender del correo de recuperación.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/controllers/PerfilController.java o AuthController.java`
- `backend/…/services/PasswordPolicy.java y AuthService.java`
- `backend/…/model/Usuario.java`
- `frontend/src/app/pages/perfil/`

**Punto de partida:** no existe el cambio de contraseña con sesión. `PerfilController` está bajo `/usuarios` y ya tiene `@PreAuthorize("isAuthenticated()")` en sus métodos. `AuthExceptionHandler` solo se aplica a `AuthController`; `TwoFactorExceptionHandler` es el patrón para extenderlo a `PerfilController`.

**Diseño**

- Endpoint `PUT /usuarios/contrasena` en `PerfilController`, con un DTO `CambiarContrasenaRequest(contrasenaActual, nuevaContrasena)` con `@NotBlank` y `@Size(max = 128)`, y un `toString()` que oculte los valores (como `LoginRequest`).
- Lógica en `PerfilService` (o un servicio nuevo):
  1. cargar el usuario autenticado y **comprobar la contraseña actual** reutilizando el límite de intentos (`LoginAttemptService.reservarIntento`, `registrarFallo`, `registrarExito`) para que no sea un vector de fuerza bruta;
  2. validar la nueva con `PasswordPolicy.validate(nueva, datosPersonalesDe(usuario))` (helper de T-07);
  3. comprobar el historial con `matchesRecentPassword` sobre el historial más el hash actual, igual que `RecuperacionContrasenaService.completar`;
  4. guardar con `usuario.registrarContrasenaHash(passwordEncoder.encode(nueva))` y `usuarioDAO.save`.
- **Sesión:** tras el cambio, rotar el identificador de la sesión actual (`request.changeSessionId()`) y cerrar **las demás** sesiones del usuario. `SesionService.cerrarSesiones(email)` expira **todas**, incluida la actual, así que hace falta un método nuevo `cerrarOtrasSesiones(email, idSesionActual)`. `SessionRegistryImpl` reacciona a `SessionIdChangedEvent` (el bean `HttpSessionEventPublisher` ya existe): compruébalo con una prueba y, si no se actualiza, reemplaza la entrada a mano.
- **Auditoría:** evento `cambio_contrasena` (T-19).
- **Frontend:** formulario en la pantalla de perfil (`perfil.html`/`perfil.ts`/`perfil.service.ts`). Sigue el patrón de los demás servicios: pedir primero `GET /usuarios/csrf` y enviar la cabecera `X-XSRF-TOKEN`.

**Preguntar al usuario:** si el cambio debe pedir también el código del segundo factor para quienes lo tienen activado (por defecto no).

**Pruebas:** servicio (contraseña actual incorrecta cuenta como fallo; política; historial; hash nuevo guardado; sesiones), controlador con `@WebMvcTest` (401 sin sesión, 400, 204, CSRF) y `.spec.ts` del formulario.

**Criterios de aceptación**

- [ ] Con la contraseña actual correcta y una nueva válida, la respuesta es 204 y se guarda el hash nuevo (bcrypt con pepper).
- [ ] Con la contraseña actual incorrecta la respuesta es de error y el intento cuenta para el límite de intentos.
- [ ] Una nueva contraseña que incumple la política o repite una de las 5 últimas devuelve 400.
- [ ] Tras el cambio, el identificador de sesión actual cambia y el resto de sesiones del usuario quedan invalidadas.
- [ ] Se registra un evento de auditoría y existe una pantalla accesible desde el perfil.

### T-13 · Rotar el identificador de sesión al cambiar los factores de autenticación

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-07 (criterio «Rotación del ID de sesión al cambiar credenciales / subir privilegios») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | Comparte lógica con T-05 |

**Por qué está pendiente (auditoría):** Al restablecer la contraseña se cierran todas las sesiones del usuario, pero al activar o desactivar el TOTP o el código por correo (PerfilService.modificarPreferenciaTercerFactor, TotpService.confirmarConfiguracion y desactivar) el identificador de sesión no se rota.

**Descripción de la tarea:** Como responsable de seguridad, quiero que la sesión se renueve cuando cambian los factores de autenticación, para evitar que una sesión anterior conserve privilegios tras el cambio.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/controllers/PerfilController.java`
- `backend/…/services/PerfilService.java y TotpService.java`
- `backend/…/services/SesionService.java`

**Punto de partida:** al restablecer la contraseña ya se cierran todas las sesiones, pero `PerfilController`/`PerfilService`/`TotpService` no rotan la sesión al activar o desactivar el TOTP (`/2fa/confirmar`, `DELETE /2fa`) ni al cambiar la preferencia del código por correo (`PUT /3fa/preferencia`).

**Diseño:** una única utilidad compartida con T-05, por ejemplo `SesionService.rotarSesion(HttpServletRequest, email)`, que haga `request.changeSessionId()` y cierre las otras sesiones del usuario. Los controladores reciben el `HttpServletRequest` y la llaman después de que el servicio termine con éxito.

**Pasos**

1. Crear (o reutilizar de T-05) la utilidad.
2. Llamarla en los tres endpoints tras el cambio correcto (no en caso de error).
3. Añadir el evento de auditoría correspondiente (T-19).

**Pruebas:** en la línea de `AuthControllerSesionTests` (usa `MockHttpSession`): el identificador cambia y la sesión sigue autenticada; en caso de error no cambia.

**Criterios de aceptación**

- [ ] Tras activar o desactivar el TOTP o el código por correo, el JSESSIONID cambia y la sesión sigue autenticada.
- [ ] Las demás sesiones del mismo usuario quedan invalidadas.
- [ ] Hay una prueba que comprueba el cambio de identificador (en la línea de AuthControllerSesionTests).

### T-06 · Caducidad de contraseñas a los 30 días

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-05 (criterio F1: caducidad a 30 días) |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | T-05 |

**Por qué está pendiente (auditoría):** El modelo Usuario guarda el hash y el historial, pero no la fecha del último cambio, por lo que no puede aplicarse la caducidad de 30 días de las aclaraciones. Buscado caducidadContrasena, passwordExpir, fechaCambioContrasena, ultimoCambio y 30 días en backend y frontend: sin resultados.

**Descripción de la tarea:** Como responsable de seguridad, quiero que las contraseñas caduquen a los 30 días, para limitar la ventana de uso de una contraseña comprometida.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/model/Usuario.java`
- `backend/…/services/AuthService.java`
- `backend/…/services/RecuperacionContrasenaService.java`
- `backend/src/main/resources/application.properties`
- `frontend/src/app/pages/login/`

**Punto de partida:** `Usuario` guarda el hash y el historial de 5 (`registrarContrasenaHash`), pero no la fecha del último cambio.

**Diseño**

- Campo nuevo `contrasenaCambiadaEn` (`Instant`) en `Usuario`, actualizado en `registrarContrasenaHash` (cubre alta, cambio de T-05, recuperación y alta de administradores). No lo toques en `actualizarContrasenaHash`, que solo re-cifra con el mismo valor.
- Propiedad `app.security.password.max-age` (por defecto `30d`) y un `Clock` inyectable, como hace `EmailOtpService`, para poder probar con reloj controlado.
- Comprobación en `AuthService.autenticar`, **después** de validar la contraseña y el estado de la cuenta (para no revelar la caducidad a quien no la conoce) y antes de abrir sesión o iniciar el 2FA. Si ha caducado, lanzar una `ContrasenaCaducadaException` que se traduzca en 403 con un código reconocible por el frontend.
- **Cómo la cambia el usuario:** el flujo más simple es la **recuperación por correo** (el frontend redirige a `/recuperar-contrasena` con un aviso). La alternativa (sesión «pendiente de cambio» que solo permita `PUT /usuarios/contrasena`) es más compleja; no la hagas sin consultarlo.
- **Cuentas existentes:** el campo será `null`. Opción recomendada: al primer inicio de sesión correcto tras el despliegue, fijarlo a «ahora» (la cuenta empieza a contar entonces). Otra: usar una fecha configurable. **Pregunta al usuario.**

**Pasos**

1. Añadir el campo, la propiedad y la excepción con su manejador (en `AuthExceptionHandler`).
2. Implementar la comprobación y la inicialización de `null`.
3. Frontend: `login.ts` reconoce el código y muestra el aviso con enlace a la recuperación.

**Pruebas:** `AuthServiceTests` con reloj fijo (29 días entra, 31 no; `null` se inicializa), `UsuarioModelTests` (la fecha cambia en `registrarContrasenaHash`), `RecuperacionContrasenaServiceTests` (renueva la fecha) y `login.spec.ts`.

**Dependencias:** T-05 (la fecha se actualiza también allí).

**Criterios de aceptación**

- [ ] Un usuario cuya contraseña tiene más de 30 días no accede a la aplicación hasta cambiarla.
- [ ] Tras cambiarla (o recuperarla) accede con normalidad y la fecha se actualiza.
- [ ] La fecha se guarda en el alta, el cambio y la recuperación.
- [ ] Las cuentas existentes se migran con una fecha inicial documentada y no se bloquean todas a la vez.
- [ ] El plazo es configurable por propiedad (por defecto 30 días) y hay pruebas con reloj controlado.

### T-09 · Alertas de intentos fallidos y bloqueos de cuenta

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-05 (criterio «Alertas de intentos fallidos») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | T-18 y T-19 (para el contexto del evento) |

**Por qué está pendiente (auditoría):** Solo se escribe un log de nivel WARN (login_fallido y login_bloqueado) sin usuario ni IP. No se avisa al titular de la cuenta ni a un administrador.

**Descripción de la tarea:** Como usuario, quiero recibir un aviso cuando alguien intente acceder repetidamente a mi cuenta, para poder reaccionar a tiempo.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/dao/LoginAttemptStore.java`
- `backend/…/services/LoginAttemptService.java y AuthService.java`
- `backend/…/services/BrevoEmailService.java y AuditoriaService.java`

**Punto de partida:** `LoginAttemptStore.registrarFallo` devuelve los segundos de espera, tanto cuando acaba de crear el bloqueo como cuando ya había uno; no distingue el caso «bloqueo nuevo». `AuditoriaService.registrarIntentoLoginFallido/registrarBloqueoLogin` solo escriben logs. `BrevoEmailService` tiene el patrón de envío asíncrono (`@Async`).

**Diseño**

- Hacer que `registrarFallo` indique si el bloqueo es **nuevo** (por ejemplo devolviendo un registro con `retryAfter` y `nuevoBloqueo`). Esto afecta a `LoginAttemptService`, `AuthService` y `LoginAttemptStoreTests`; actualízalos.
- Nuevo método en `BrevoEmailService` (`enviarAvisoBloqueo(destinatario)`), asíncrono y con el mismo estilo que `enviarRecuperacionEnSegundoPlano`. El texto no debe contener datos sensibles.
- Límite para no inundar: una ventana de 1 aviso por hora y cuenta, reutilizando el mecanismo de ventanas de `LoginAttemptStore` (`reservarVentana`, hoy privado).
- Solo se envía si la cuenta **existe** y solo al titular; quien ataca no recibe nada distinto.
- Auditoría: evento `bloqueo_cuenta` (T-19) con usuario seudonimizado e IP.

**Preguntar al usuario:** si además se quiere avisar a los administradores (por defecto no).

**Pruebas:** servicio con el correo simulado (se envía una vez por bloqueo, no se envía si no existe la cuenta, respeta el límite de una hora), y `LoginAttemptStoreTests` con el nuevo valor de retorno.

**Dependencias:** T-18 y T-19.

**Criterios de aceptación**

- [ ] Tras activarse un bloqueo de cuenta se envía como máximo un correo por bloqueo al titular.
- [ ] No se envía ningún correo ni se revela información si el correo no pertenece a una cuenta.
- [ ] El evento queda registrado con usuario seudonimizado e IP.
- [ ] Hay pruebas con el envío de correo simulado.

---

## Fase 4 – Abuso y entrada de datos

El orden es **T-22 → T-11 → T-10 → T-12**: T-22 crea el mecanismo de límites que T-10 reutiliza.

### T-22 · Rate limiting general de la API y del envío de códigos OTP

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (criterio «Rate limiting en peticiones») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** Solo el login tiene límite (5 intentos cada 5 minutos). El envío de OTP permite 5 cada 10 minutos por correo y 3 por reto, no 3 por hora y 10 al día, y no hay límite general de la API (60 peticiones por minuto y usuario). Buscado bucket4j, resilience4j y RateLimiter en pom.xml y código: sin resultados.

**Descripción de la tarea:** Como responsable de seguridad, quiero limitar el ritmo de peticiones y de envíos de códigos, para frenar la fuerza bruta, el abuso y la denegación de servicio.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/dao/LoginAttemptStore.java`
- `backend/…/services/EmailOtpService.java`
- `backend/…/security/ (nuevo filtro)`
- `backend/src/main/resources/application.properties`

**Punto de partida:** solo el login está limitado (`LoginAttemptStore`: 5 intentos / 5 min por IP+usuario, con almacén en MongoDB). `reservarEnvioOtp` permite 5 envíos cada 10 minutos por correo; `EmailOtpService` limita además 3 envíos por reto. `LimiteSolicitudesRecuperacion` es un precedente de límite **en memoria** con `Clock`. No hay límite general.

**Diseño**

- **Dos niveles:**
  - **Persistente** (MongoDB, válido con varias instancias) para lo sensible y de poco volumen: login, OTP, registro. Expón en `LoginAttemptStore` un método genérico público (`reservar(clave, ahora, ventanaSegundos, límite)`) apoyado en `reservarVentana`.
  - **En memoria** para el límite general de la API (60 peticiones/min), siguiendo el patrón de `LimiteSolicitudesRecuperacion`; hacerlo en MongoDB supondría una escritura por petición. Documenta la limitación (por instancia).
- **Filtro** `OncePerRequestFilter` situado antes de `AuthorizationFilter`, con la clave = usuario autenticado o, si es anónimo, la IP; responde `429` con `Retry-After` y `ApiErrorResponse`. Límites **configurables** por propiedades.
- **Exclusiones:** recursos estáticos, `/usuarios/csrf` y `/usuarios/sesion-actual` (el frontend consulta esta última en cada cambio de ruta). Antes de fijar 60/min, mide cuántas peticiones hace una página típica del frontend para no afectar al uso normal.
- **OTP:** cambiar `reservarEnvioOtp` a **3 por hora y 10 por día** por correo (dos ventanas; comprueba primero la diaria para no consumir la horaria de más). Mantén el límite de 3 por reto.
- **IP real:** `server.forward-headers-strategy=native` hace que `getRemoteAddr()` devuelva la IP original detrás de Render; compruébalo en el despliegue.

**Pruebas:** unitarias del filtro (60 pasan, la 61 recibe 429 con `Retry-After`; ventana que se renueva con reloj controlado; exclusiones); `LoginAttemptStoreTests` para las ventanas de OTP (3/h y 10/día); y el uso normal sin 429.

**Preguntar al usuario:** si los límites por defecto (60/min) valen o prefiere otros.

**Criterios de aceptación**

- [ ] Más de 60 peticiones por minuto del mismo usuario (o IP si es anónimo) reciben 429 con Retry-After, sin afectar al uso normal.
- [ ] El cuarto envío de OTP en una hora y el undécimo en 24 horas reciben 429.
- [ ] Los límites son configurables por propiedades.
- [ ] Se comprueba que detrás de Render se obtiene la IP real del cliente.
- [ ] Hay pruebas de cada límite.

### T-11 · Completar la validación de entrada del registro y del login

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-06 y criterio «Validación de entrada en servidor» |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** RegistroClienteRequest, RegistroVendedorRequest y RegistroAdministradorRequest solo exigen @NotBlank en nombre y apellidos; teléfono e imagenPerfil no tienen límite ni formato, y la imagen de perfil no se valida en el alta (sí en la modificación, con exigencia de HTTPS). LoginRequest no limita el tamaño de la contraseña.

**Descripción de la tarea:** Como responsable de seguridad, quiero validar en el servidor todos los campos de las peticiones de alta y acceso, para impedir datos mal formados o desmesurados.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/dto/RegistroClienteRequest.java, RegistroVendedorRequest.java, RegistroAdministradorRequest.java y LoginRequest.java`
- `backend/…/services/AdministradorService.java (validarImagenPerfil)`
- `frontend/src/app/pages/register/`

**Punto de partida:** `RegistroClienteRequest`, `RegistroVendedorRequest` y `RegistroAdministradorRequest` solo exigen `@NotBlank` en nombre y apellidos; teléfono e `imagenPerfil` no tienen límites. `AdministradorService.validarImagenPerfil` exige HTTPS y 1000 caracteres, pero solo se usa en la modificación. `LoginRequest` no limita la contraseña (`CompletarRecuperacionRequest` ya la limita a 128). `SoporteRegistro.validarSolicitud` ya ejecuta Bean Validation sobre las peticiones de cliente y vendedor, y `AdministradorService.registrar` usa `validator.validate`.

**Diseño**

- `@Size(max = …)` en nombre, apellidos y nombre comercial; `@Pattern` para el teléfono con la misma expresión que `validarTelefono` (`^\+?[0-9\s().-]{7,20}$`), permitiendo vacío; `@Size(max = 1000)` en `imagenPerfil`; `@Size(max = 128)` en `password` y `@Size(max = 254)` en `email` de `LoginRequest`.
- Un validador reutilizable para la URL de imagen (anotación propia como `@Adult` en `validation/`, o método compartido) para exigir HTTPS en el alta y en la modificación.
- **No restrinjas los caracteres de los nombres** (hay apellidos con apóstrofos y tildes); como mucho, rechaza caracteres de control.
- Los errores salen por `InvalidRegistrationException` con el formato `ApiErrorResponse` actual; no lo cambies.

**Pasos:** anotar los DTO; crear el validador; adaptar las pruebas existentes (`RegistrationValidationControllerTests`, y la prueba que construye `RegistroClienteRequest`); ajustar `register.ts` para mostrar los mensajes y añadir `maxlength` en el formulario.

**Pruebas:** al estilo de `DireccionRequestTest` (valida el DTO con un `Validator`): casos de longitud y formato por campo, y de la URL de imagen.

**Criterios de aceptación**

- [ ] Valores demasiado largos o con formato inválido devuelven 400 con errores por campo en el formato ApiErrorResponse actual.
- [ ] Una imagenPerfil que no sea una URL HTTPS válida se rechaza también en el alta.
- [ ] Una contraseña de más de 128 caracteres se rechaza en el login.
- [ ] Hay pruebas para cada DTO y el frontend muestra los errores.

### T-10 · Proteger el registro público frente al abuso (límite por IP y CSRF)

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-06 (registro de usuario seguro) |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** Cada alta en /cliente/register y /vendedor/register ejecuta un bcrypt de coste 12 y crea un usuario pendiente, sin ningún límite por IP. Un cliente automatizado puede consumir CPU y llenar la colección. Además ambos endpoints están excluidos de la protección CSRF (SecurityConfiguration, ignoringRequestMatchers).

**Descripción de la tarea:** Como responsable de seguridad, quiero limitar y proteger el alta pública de cuentas, para evitar el abuso del registro y las peticiones forzadas desde otros sitios.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/config/SecurityConfiguration.java`
- `backend/…/dao/LoginAttemptStore.java`
- `backend/…/controllers/ClienteController.java y VendedorController.java`
- `frontend/src/app/pages/register/registration.service.ts`

**Punto de partida:** `SecurityConfiguration` excluye `/cliente/register` y `/vendedor/register` de CSRF (`ignoringRequestMatchers`) y no hay límite. En el frontend, cada servicio que hace un `POST` primero pide `GET /usuarios/csrf` y envía `X-XSRF-TOKEN` (ver `administrador.service.ts` y `carrito.service.ts`); `registration.service.ts` **no** lo hace.

**Pasos**

1. Añadir la regla de T-22 para `POST /cliente/register` y `POST /vendedor/register` (por ejemplo 5 altas cada 15 minutos por IP) con respuesta 429 y `Retry-After`. La respuesta de los registros válidos sigue siendo la misma `202` uniforme.
2. Quitar las dos rutas de `ignoringRequestMatchers`.
3. Adaptar `registration.service.ts` para obtener el token CSRF antes de enviar el formulario, siguiendo el patrón de los otros servicios.
4. Actualizar las pruebas de registro (`RegistrationValidationControllerTests` y otras que hagan `post` a estas rutas) para enviar `csrf()`.

**Pruebas:** `@WebMvcTest`: sin token → 403; con token → 202; superado el límite → 429 con `Retry-After`. `.spec.ts` del servicio.

**Verificación manual:** registrar un cliente desde el formulario con la aplicación arrancada.

**Criterios de aceptación**

- [ ] Superado el límite de altas desde una IP en la ventana, la respuesta es 429 con Retry-After.
- [ ] El alta normal desde el formulario sigue funcionando con CSRF activado.
- [ ] Una petición de registro sin token CSRF válido recibe 403.
- [ ] El límite no cambia la respuesta uniforme 202 ni revela si el correo existe.
- [ ] Hay pruebas del límite y del CSRF, y una prueba manual del formulario.

### T-12 · Verificación de la propiedad del correo en el alta

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-06 (registro de usuario seguro) |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** El alta no comprueba que quien se registra controla el correo: la cuenta queda pendiente y la activa un administrador, y los correos de recuperación y del tercer factor se envían a direcciones no verificadas.

**Descripción de la tarea:** Como usuario, quiero confirmar mi correo al registrarme, para demostrar que la cuenta es mía y recibir correctamente los avisos de seguridad.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/services/ClienteService.java, VendedorService.java y SoporteRegistro.java`
- `backend/…/model/TokenRecuperacion.java (patrón a reutilizar)`
- `backend/…/services/BrevoEmailService.java`
- `frontend/src/app/pages/register/`

**Punto de partida:** la cuenta queda `activada=false` y la activa un administrador; los correos de recuperación y del tercer factor van a direcciones no verificadas. `TokenRecuperacion` + `TokenRecuperacionDAO` + `RecuperacionContrasenaService` son el patrón a copiar (token de 32 bytes con `SecureRandom`, guardado como SHA-256, índice TTL, consumo atómico).

**Preguntar al usuario antes de empezar:** ¿la verificación del correo **sustituye** a la activación por administrador o la **complementa**? La opción recomendada es **complementar** (la cuenta solo es utilizable si está activada **y** verificada).

**Diseño**

- Campo `correoVerificado` en `Usuario`. Las cuentas existentes deben tratarse como verificadas (no los dejes bloqueados).
- Modelo `TokenVerificacionCorreo` y su DAO, con el mismo patrón que `TokenRecuperacion`.
- En `ClienteService.registrar` y `VendedorService.registrar`: generar el token y enviar el correo de forma asíncrona (método nuevo en `BrevoEmailService`) **solo cuando la cuenta es nueva**; si el correo ya existe no se envía nada y la respuesta sigue siendo la misma `202`.
- Endpoint público `POST /usuarios/verificar-correo` con el token: añádelo a la lista pública de `SecurityConfiguration`.
- Frontend: página `verificar-correo` (ruta en `app.routes.ts`). **Una ruta nueva del frontend se registra en tres sitios:** `app.routes.ts`, `SpaController` y la lista de rutas HTML permitidas de `SecurityConfiguration`.
- Auditoría: evento `correo_verificado`.

**Pruebas:** servicio (token generado y solo como hash; consumo único; caducado; cuenta inexistente no revela nada), controlador, `AuthService` (cuenta sin verificar según la decisión), `.spec.ts` de la página.

**Criterios de aceptación**

- [ ] Tras el registro se envía un correo con un enlace de un solo uso y caducidad (por ejemplo 24 horas).
- [ ] El enlace válido marca el correo como verificado; uno caducado o ya usado devuelve un error genérico.
- [ ] El token solo se guarda como hash.
- [ ] La respuesta del registro es la misma exista o no el correo.
- [ ] Queda definido y probado si la verificación se combina con la activación por administrador.

---

## Fase 5 – Endurecimiento HTTP y permisos

### T-21 · Content-Security-Policy y cabeceras de seguridad

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (buenas prácticas de endurecimiento del frontend) |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** No hay Content-Security-Policy. Buscado Content-Security-Policy y contentSecurityPolicy en backend y frontend: sin resultados. Solo se usan las cabeceras por defecto de Spring Security y X-Content-Type-Options en las imágenes.

**Descripción de la tarea:** Como responsable de seguridad, quiero una política de seguridad de contenido, para reducir el impacto de un posible XSS.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/config/SecurityConfiguration.java`
- `frontend/src/index.html`

**Punto de partida:** no hay CSP. Solo las cabeceras por defecto de Spring Security y `X-Content-Type-Options` en las imágenes.

**Diseño**

- En `SecurityConfiguration`, `http.headers(...)` con `contentSecurityPolicy`, `referrerPolicy` y `permissionsPolicyHeader`. Política de partida:
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- `img-src` necesita `data:` (el QR del TOTP se muestra como `data:image/png`) y `https:` (las imágenes de perfil son URL HTTPS externas).
- Empieza con `contentSecurityPolicyReportOnly`, revisa la consola del navegador y pasa a modo obligatorio cuando no haya violaciones.
- **Trampa de Angular:** la «inlining» de CSS crítico de la compilación de producción puede insertar un `onload` en línea que la política bloquea (los estilos no cargarían). Si ocurre, desactiva `optimization.styles.inlineCritical` en `angular.json`.

**Pruebas:** `@WebMvcTest` con `@Import(SecurityConfiguration.class)`: la cabecera está presente y contiene las directivas principales.

**Verificación manual:** construir el frontend en producción y navegar por login, catálogo, imágenes y perfil con el QR sin violaciones en la consola. Prueba que un script en línea inyectado se bloquea.

**Criterios de aceptación**

- [ ] La cabecera Content-Security-Policy está presente en las respuestas HTML y de la API.
- [ ] La aplicación funciona sin violaciones de la política en la consola (login, catálogo, imágenes, perfil con el QR).
- [ ] Un script inline inyectado de prueba es bloqueado.
- [ ] Hay una prueba que verifica la cabecera.

### T-23 · Permisos finos (authorities) además de los roles

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (criterio «Roles y permisos finos») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** Existen tres roles equivalentes (CLIENTE, VENDEDOR, ADMIN), pero cada usuario tiene una única autoridad ROLE_x (ContextoAutenticacion.crear) y todas las reglas usan hasRole; no hay permisos granulares.

**Descripción de la tarea:** Como responsable de seguridad, quiero permisos finos asociados a los roles, para aplicar el mínimo privilegio con más precisión.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/security/ContextoAutenticacion.java y RolUsuario.java`
- `backend/…/config/SecurityConfiguration.java`
- `backend/…/controllers/AdministradorController.java`

**Punto de partida:** `ContextoAutenticacion.crear(email, rol)` crea una sola autoridad `ROLE_x`; `SecurityConfiguration` usa `hasRole`/`hasAnyRole` por prefijo de ruta y algunos controladores usan `@PreAuthorize`. Las pruebas usan `roles(...)` unas **265** veces.

**Diseño recomendado:** declarar los permisos **una sola vez** con una **jerarquía de roles** (`RoleHierarchy`): `ROLE_ADMIN` implica sus permisos, etc. Así las pruebas que usan `roles("ADMIN")` siguen funcionando porque la jerarquía expande los permisos sin tocar cada prueba.

- Catálogo (a validar con el usuario), por ejemplo: `USUARIOS_LEER`, `USUARIOS_MODIFICAR`, `USUARIOS_BLOQUEAR`, `ADMINISTRADORES_GESTIONAR`, `CATEGORIAS_GESTIONAR`, `PRODUCTOS_GESTIONAR` (vendedor), `PEDIDOS_VENDEDOR_GESTIONAR`, `AUDITORIA_CONSULTAR`…
- Exponer el `RoleHierarchy` como bean y verificar que lo usan tanto la autorización HTTP como la de métodos (`@PreAuthorize`). **Comprueba la API exacta en Spring Security 7** (documentación o `WebFetch`) antes de escribirla; no la des por supuesta.
- Aplicar `hasAuthority(...)` donde aporte (administración de usuarios, categorías, escritura de productos), manteniendo las reglas por rol actuales.
- **Plan B** si la jerarquía no cubre bien el caso: añadir las autoridades explícitas en `ContextoAutenticacion.crear` y un ayudante de pruebas común. Implica tocar muchas pruebas: pregunta antes.

**Pruebas:** que cada rol tiene exactamente sus permisos; que una operación protegida con un permiso concreto se deniega sin él (403); y que toda la suite de seguridad existente sigue pasando.

**Coordinación:** T-03 (otros) toca `AdministradorController`.

**Criterios de aceptación**

- [ ] El catálogo de permisos y su asignación por rol están documentados.
- [ ] La sesión contiene el rol y sus permisos.
- [ ] Las operaciones de administración y de escritura exigen un permiso concreto además del rol.
- [ ] Se mantienen las pruebas de acceso (401 y 403) y se añade una que comprueba que quitar un permiso deniega la operación.

---

## Fase 6 – Imágenes

El orden es **T-33 → T-35 → T-34**. T-34 es **opcional**: confirma con el usuario si se hace.

### T-33 · Recodificar las imágenes subidas y eliminar metadatos

| Campo | Valor |
|---|---|
| Requisito de origen | Aclaraciones 2.6 (criterio «Transcodificación en sandbox») |
| Estado de partida | No implementado |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** ProductoImagenService guarda la imagen tal cual tras validar firma, extensión y fin de fichero; no se recodifica ni se eliminan metadatos EXIF. Buscado ImageIO.read, Thumbnail, ffmpeg y exif: la única coincidencia de ImageIO es la generación del QR del TOTP.

**Descripción de la tarea:** Como responsable de seguridad, quiero que las imágenes se recodifiquen antes de guardarse, para eliminar contenido oculto y metadatos y reducir el riesgo de ficheros manipulados.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/services/ProductoImagenService.java`
- `backend/…/services/ProductoImagenMongoService.java`

**Punto de partida:** `ProductoImagenService.guardar` valida tamaño (5 MB), firma real (PNG/JPG/GIF), extensión, `Content-Type` coherente y marca de fin de fichero; después llama a VirusTotal (si está activo), genera el nombre `UUID.ext` y guarda en disco o en MongoDB. No decodifica ni recodifica la imagen. `TotpService` ya usa `ImageIO`, así que `java.desktop` está disponible.

**Diseño**

- Después de las validaciones actuales y **antes** de VirusTotal y del almacenamiento, recodificar con `ImageIO` y guardar **los bytes nuevos** (válido para los dos modos de almacenamiento).
- **Dimensiones antes de decodificar:** con `ImageIO.getImageReaders` leer ancho y alto del encabezado y rechazar por encima de un límite documentado (por ejemplo, 4000×4000 o 16 millones de píxeles) para evitar «bombas de descompresión».
- **Tiempo y memoria:** ejecutar la decodificación con un tiempo máximo (por ejemplo, un `Future` con `timeout`). Aislarla en un proceso o contenedor aparte es una mejora opcional que se documenta.
- **Formatos:** PNG y JPEG se recodifican (el JPEG a RGB y con calidad fija); el **GIF** es el caso delicado, porque `ImageIO` solo escribe un fotograma. **Pregunta al usuario** si se aceptan GIF animados convertidos a estáticos o si se rechazan los animados.
- La marca de fin de fichero (`terminaCorrectamente`) se cumple sola con una imagen recodificada.

**Pruebas:** `ProductoImagenServiceTests` y `ProductoImagenMongoServiceTests`. **Las imágenes de prueba actuales pueden ser cabeceras mínimas que `ImageIO` no decodifica;** genera imágenes reales en la prueba con `BufferedImage` + `ImageIO.write`. Casos: se eliminan los metadatos, imagen corrupta, dimensiones excesivas, imagen válida intacta visualmente.

**Criterios de aceptación**

- [ ] La imagen almacenada es la recodificada y no conserva EXIF.
- [ ] Una imagen corrupta o con datos añadidos se rechaza o se limpia.
- [ ] Una imagen con dimensiones por encima del límite documentado se rechaza.
- [ ] Las imágenes válidas se siguen mostrando y las pruebas de ProductoImagenServiceTests se amplían.

### T-35 · Activar el antivirus y reforzar las cabeceras de entrega de imágenes

| Campo | Valor |
|---|---|
| Requisito de origen | Aclaraciones 2.6 (criterios opcionales «Escaneo antivirus» y «Cabeceras seguras en descargas») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** VirusTotalService está implementado (modo fail-closed) pero desactivado por defecto (virustotal.enabled=false). En la entrega de imágenes solo se envían X-Content-Type-Options: nosniff y el Content-Type correcto, sin Content-Disposition ni Content-Security-Policy.

**Descripción de la tarea:** Como responsable de seguridad, quiero analizar las imágenes subidas con un antivirus y servirlas con cabeceras seguras, para reducir el riesgo de contenido malicioso.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/src/main/resources/application.properties`
- `backend/…/services/VirusTotalService.java y ProductoImagenService.java`
- `backend/…/config/ProductoImagenConfiguration.java y controllers/ProductoImagenMongoController.java`

**Punto de partida:** `VirusTotalService` está completo (`fail-closed`, hasta 30 consultas cada 2 s) y desactivado por defecto (`virustotal.enabled=false`). La entrega añade `X-Content-Type-Options: nosniff` en `ProductoImagenConfiguration` (modo local, interceptor de `/product-images/**`) y en `ProductoImagenMongoController` (modo `mongo`).

**Diseño**

- **Cabeceras:** añadir en **ambas rutas de entrega** `Content-Security-Policy: default-src 'none'; sandbox` y `Content-Disposition: inline; filename="imagen"`. **No** añadas `Cross-Origin-Resource-Policy: same-origin`: rompería la visualización en desarrollo (frontend en `:4200`, API en `:8443`).
- **Antivirus:** es **configuración manual** en el despliegue (`VIRUSTOTAL_ENABLED=true` y `VIRUSTOTAL_API_KEY` en Render). La API gratuita tiene cuota baja y, con `fail-closed`, si VirusTotal falla **no se pueden subir imágenes**: documenta este compromiso y pregunta al usuario si lo asume.
- **Prueba funcional** con `VirusTotalService` simulado.

**Pruebas:** en la línea de `ProductoImagenMongoControllerTests` (cabeceras presentes en el modo `mongo`) y una prueba del interceptor del modo local; `VirusTotalService` con `RestClient` simulado si no existen pruebas.

**Preguntar al usuario:** si activa VirusTotal en producción y acepta el `fail-closed`.

**Criterios de aceptación**

- [ ] En el despliegue VIRUSTOTAL_ENABLED es true y un fichero rechazado por VirusTotal impide el alta (probado con doble).
- [ ] Las cabeceras están presentes con almacenamiento local y con MongoDB.
- [ ] La clave de VirusTotal no está en el repositorio y la gestión de cuota y de tiempos de espera está documentada.

### T-34 · URLs firmadas con caducidad para las imágenes (opcional)

| Campo | Valor |
|---|---|
| Requisito de origen | Aclaraciones 2.6 (criterio opcional «URLs firmadas con caducidad controlada») |
| Estado de partida | No implementado |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** /product-images/** es público (permitAll) con nombres UUID: no hay firma ni caducidad. El checklist lo marca como opcional.

**Descripción de la tarea:** Como responsable de seguridad, quiero que el acceso a las imágenes use URLs firmadas con caducidad, para evitar el acceso o el enlazado indiscriminado.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/config/SecurityConfiguration.java`
- `backend/…/controllers/ProductoImagenMongoController.java`
- `backend/…/config/ProductoImagenConfiguration.java`
- `backend/…/services/ProductoService.java`

**Punto de partida:** `/product-images/**` es público (`permitAll`) con nombres UUID. El campo `imagen` de `Producto` guarda `/product-images/<uuid>.<ext>` y se copia **tal cual** a varias respuestas (`ProductoService`, `CarritoService`, `FavoritoService`…). El frontend solo antepone `/product-images/` en tres sitios (`carrito.ts`, `checkout.ts`, `producto.service.ts`) cuando la ruta no empieza por `/`.

**Diseño**

- Servicio de firma `HMAC-SHA256(nombre + ":" + expiración)` con clave en variable de entorno (Base64 de 32 bytes, validada al arrancar como en `TotpCryptoService`).
- **Un único punto de salida:** crear un componente que, dado el valor guardado, devuelva la URL firmada, y llamarlo en **todos** los sitios donde se compone una respuesta con `imagen` (búscalos con `Grep "getImagen()"`).
- **Validación** con un interceptor o filtro en `/product-images/**` que sirva para los dos modos de almacenamiento: firma inválida → 403; caducada → 410.
- **Caché:** una URL distinta en cada respuesta impide la caché del navegador. Redondea la caducidad a la siguiente hora (ventana fija) para que la URL sea estable dentro de ese periodo.

**Pruebas:** firma válida, inválida, manipulada y caducada; el catálogo devuelve URLs firmadas; las imágenes siguen cargando.

**Preguntar al usuario:** si se implementa (es opcional en el checklist) y la duración de la caducidad.

**Criterios de aceptación**

- [ ] Una petición sin firma, con firma inválida o caducada recibe 403 o 410.
- [ ] Una URL válida sirve la imagen y la caducidad es configurable.
- [ ] El catálogo y el panel del vendedor siguen mostrando las imágenes.
- [ ] La clave de firma no está versionada y hay pruebas.

---

## Fase 7 – Privacidad y avisos de seguridad

### T-24 · RGPD: política de privacidad, aviso legal y consentimiento

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (criterio «Cumplimiento RGPD») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** No hay política de privacidad, aviso legal, consentimiento en el registro ni política de retención. Buscado rgpd, gdpr, privacidad, consentimiento, cookies y protección de datos en frontend y backend: sin resultados. Sí existen el derecho de supresión (baja de cuenta), el cifrado y el enmascarado.

**Descripción de la tarea:** Como usuario, quiero conocer cómo se tratan mis datos y aceptar de forma expresa su tratamiento al registrarme, para ejercer mis derechos con garantías.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `frontend/src/app/pages/register/`
- `frontend/src/app/app.routes.ts`
- `backend/…/dto/Registro*Request.java`
- `backend/…/model/Usuario.java`
- `documents/ (documentos RGPD)`

**Punto de partida:** no hay páginas de privacidad ni consentimiento (buscado `rgpd`, `privacidad`, `consentimiento`: sin resultados). Ya existen la baja de cuenta (`BajaUsuarioService`), el cifrado de DNI y teléfono y el enmascarado.

**Diseño**

- **Textos:** redáctalos como plantilla en `documents/` (política de privacidad, aviso legal, registro de actividades de tratamiento y política de retención) con los datos que no estén en el repositorio marcados como `[COMPLETAR: …]` (responsable del tratamiento, contacto, base jurídica concreta). **No inventes datos legales.** Los destinatarios reales del tratamiento sí constan: Brevo (correo), VirusTotal (imágenes, si se activa), MongoDB Atlas y Render (alojamiento).
- **Frontend:** páginas públicas de política y aviso legal. Cada ruta nueva se registra en tres sitios (`app.routes.ts`, `SpaController` y la lista de rutas HTML de `SecurityConfiguration`). Enlaces en el pie de la aplicación y en el registro.
- **Consentimiento:** casilla obligatoria y **no premarcada** en el registro de clientes y vendedores. Añade a las peticiones de registro un campo booleano `aceptaPolitica` con `@AssertTrue` y guarda en el usuario la **versión de la política** y la **fecha de aceptación**. `RegistroClienteRequest` es un `record` usado con `new` en una prueba (7 llamadas) y en los formularios: actualiza esos usos.
- Va **después de T-11, T-10 y T-12**, que modifican los mismos DTO y el mismo formulario.

**Pruebas:** registro sin aceptar → 400; con aceptación se guardan versión y fecha; páginas accesibles sin sesión; `.spec.ts` del formulario.

**Preguntar al usuario:** datos del responsable y del contacto; versión inicial de la política.

**Criterios de aceptación**

- [ ] La política de privacidad y el aviso legal son accesibles sin iniciar sesión.
- [ ] El registro exige aceptar la política (400 si no se acepta) y guarda la versión y la fecha aceptadas.
- [ ] La retención y el registro de actividades de tratamiento están documentados.
- [ ] El equipo ha revisado los textos.

### T-25 · RGPD: exportación de los datos personales del usuario

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (criterio «Cumplimiento RGPD»: acceso y portabilidad) |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** El usuario puede suprimir su cuenta (BajaUsuarioService) pero no obtener una copia de sus datos personales, que exigen los derechos de acceso y portabilidad.

**Descripción de la tarea:** Como usuario, quiero descargar una copia de mis datos personales, para ejercer mi derecho de acceso y portabilidad.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `backend/…/controllers/PerfilController.java`
- `backend/…/services/PerfilService.java`
- `frontend/src/app/pages/perfil/`

**Punto de partida:** existe la baja de cuenta pero no la exportación. `PerfilService.consultarPerfil` devuelve DNI y teléfono **enmascarados**; las entidades se leen con los datos ya descifrados por el conversor de Mongo.

**Diseño**

- `GET /usuarios/mis-datos` con `@PreAuthorize("isAuthenticated()")` que devuelva un **DTO explícito** (no la entidad) con perfil, direcciones, pedidos, listas, valoraciones y métodos de pago enmascarados. Excluye hashes, secretos TOTP, códigos de respaldo y tokens. Respuesta con `Content-Disposition: attachment; filename=mis-datos.json`.
- Para vendedores incluye sus datos y productos; adapta según el tipo de usuario.
- Los datos descifrados (DNI y teléfono) se entregan solo a su titular. **Pregunta** si deben ir completos o enmascarados.
- Límite de frecuencia (por ejemplo, una exportación por minuto, con el mecanismo de T-22) y evento de auditoría `exportacion_datos` (T-19).
- Frontend: botón en el perfil que descarga el JSON (`blob` + enlace temporal).

**Pruebas:** el DTO no contiene campos secretos (comprobar por reflexión o por el JSON); un usuario no obtiene datos ajenos; solo autenticados; auditoría.

**Coordinación:** `PerfilController`/`PerfilService` los toca también T-04 (otros).

**Criterios de aceptación**

- [ ] El usuario autenticado descarga solo sus propios datos en JSON.
- [ ] No se incluyen contraseñas, secretos TOTP, códigos de respaldo ni tokens.
- [ ] Los datos cifrados (DNI, teléfono) se descifran solo para su titular.
- [ ] Cada exportación queda auditada y hay pruebas de que otro usuario no puede obtener datos ajenos.

### T-27 · Incentivar la activación del segundo factor en los clientes

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-16 (criterio «Política por rol: Usuario con 3FA opcional e incentivo a activar F2») |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Baja |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** Para los clientes la 2FA es opcional y el único incentivo es un texto en la pantalla de perfil (perfil.html). No hay aviso tras iniciar sesión ni ventaja asociada.

**Descripción de la tarea:** Como cliente, quiero que la aplicación me recuerde activar el segundo factor, para proteger mi cuenta sin que sea obligatorio.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `frontend/src/app/pages/perfil/perfil.html`
- `frontend/src/app/shared/cabecera/`
- `frontend/src/app/pages/paneles/cliente.ts`

**Punto de partida:** el único incentivo es un texto en `perfil.html`. `PerfilResponse` ya incluye `totpActivado` y `emailOtpActivado`. `marca-sesion.ts` usa `sessionStorage`, un buen precedente para recordar que el aviso se descartó en la sesión.

**Diseño:** componente compartido (en `shared/`) que se muestra solo si el usuario es **cliente** y no tiene TOTP: aviso descartable con enlace a la configuración del perfil. Se descarta una vez por sesión del navegador (`sessionStorage`), no bloquea el uso y desaparece al activar el segundo factor. Incluirlo en `app.html` o en el panel del cliente, reutilizando el servicio de perfil existente.

**Pruebas:** `.spec.ts` del componente (visible para cliente sin TOTP, oculto con TOTP, oculto para vendedor y administrador, se descarta y no reaparece).

**Coordinación:** el perfil lo toca T-04 (otros).

**Criterios de aceptación**

- [ ] Un cliente sin TOTP ve el aviso tras iniciar sesión, con enlace a la configuración.
- [ ] El aviso desaparece al activar el segundo factor y se puede descartar sin repetirse en la misma sesión.
- [ ] No bloquea el uso de la aplicación y hay una prueba de componente.

---

## Fase 8 – Documentación y cierre

### T-26 · Documentar la correspondencia con CCN-CERT BP/28

| Campo | Valor |
|---|---|
| Requisito de origen | RQ-15 (cumplir los principios del documento CCN-CERT BP/28) |
| Estado de partida | Parcial |
| Prioridad (propuesta) | Media |
| Dependencias (auditoría) | — |

**Por qué está pendiente (auditoría):** No hay en el repositorio un documento que relacione los principios del BP/28 con el código. La tabla de la memoria es una correspondencia hecha en la auditoría y no se ha contrastado con el listado oficial.

**Descripción de la tarea:** Como equipo, queremos demostrar con un documento cómo cumplimos cada principio del BP/28, para justificar el RQ-15 con trazabilidad.

**Ficheros orientativos (la auditoría los localizó en el commit `9a8f5a7`; verifica su estado actual):**

- `documents/ (nuevo documento)`
- `memoria/Memoria_SSS_P1.docx (apartado del RQ-15)`

**Punto de partida:** la memoria (`memoria/Memoria_SSS_P1.docx`, apartado del RQ-15) contiene una tabla de principios hecha en la auditoría que **no está contrastada** con el listado oficial.

**Pasos**

1. **Pide al usuario el documento oficial CCN-CERT BP/28** (no está en el repositorio, `documents/` no lo incluye). Sin él, no inventes los principios.
2. Elabora `documents/Correspondencia_BP28.md` (o el formato que prefiera) con la tabla: principio → medida implementada → evidencia (clase o ruta) → estado → tarea asociada para los huecos. Usa el estado real del código **tras las fases anteriores**.
3. Enlázalo desde el README del proyecto o la memoria.

**Criterios de aceptación**

- [ ] El documento recoge todos los principios del BP/28 oficial.
- [ ] Cada principio tiene medida y evidencia, o una tarea asociada.
- [ ] El equipo lo ha revisado y está incluido en la memoria.

### Verificación final

Cuando todas las fases estén hechas:

1. Backend completo: `./mvnw -B clean verify -Dtest='!BackendApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false` (cobertura ≥ 60 %, ningún fallo). Compara con la línea base.
2. Frontend: `npm test -- --watch=false --coverage` y `npm run build` (si Node lo permite).
3. `comprobar-secretos` sobre todo el diff desde la línea base.
4. Actualiza `PROGRESO.md` y deja una nota con los cambios que el chat de **auditoría** debe volver a revisar (requisitos afectados por fase).
5. Lista para el usuario lo que queda **manual**: activación de VirusTotal (T-35), despliegue de variables nuevas (clave de URLs firmadas, `LOG_FORMAT`, etc.).
