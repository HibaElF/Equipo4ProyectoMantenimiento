# Contexto del proyecto ESIBuy (para el chat de implementación)

> Resumen verificado del proyecto, de su seguridad actual y del entorno. Léelo entero antes de la Fase 0. Si algo no coincide con el código real, **manda el código** y avisa al usuario.

## 1. Qué es

ESIBuy es una plataforma web de comercio electrónico de juguete, con fines educativos, que el Equipo 4 mantiene en la asignatura **Seguridad de Sistemas Software (práctica P1)**. Permite buscar, comprar y valorar productos, con gestión de carrito, pedidos, favoritos y listas.

Tiene tres roles: **ADMIN** (administra usuarios, categorías y consulta productos), **VENDEDOR** (gestiona sus productos y los pedidos que le llegan) y **CLIENTE** (compra, direcciones, métodos de pago simulados, listas, valoraciones; puede ser premium).

El trabajo actual es **corregir carencias de seguridad** detectadas en una auditoría frente a una checklist de 19 requisitos (RQ-01 a RQ-19). Este chat implementa 23 tareas (T-xx) del plan `requisitos-seguridad/PLAN_IMPLEMENTACION.md`.

## 2. Estructura del repositorio

La raíz del repositorio (`Equipo4ProyectoMantenimiento/`) **no** es la raíz del proyecto:

```
Equipo4ProyectoMantenimiento/            ← raíz Git (abre aquí Claude Code)
├── CLAUDE.md, .claude/skills/           ← instrucciones y skills de este trabajo
├── requisitos-seguridad/                ← plan, progreso, prompts y contexto
├── auditoria/primera_auditoria/         ← auditoría original (solo consulta)
├── memoria/Memoria_SSS_P1.docx          ← memoria de la práctica
└── Proyecto_ISO_2627-main/              ← EL PROYECTO
    ├── Agents.md                        ← reglas de trabajo del equipo (lee este fichero)
    ├── backend/                         ← Spring Boot (src/main/java/es/uclm/esibuy/backend/…)
    ├── frontend/                        ← Angular (src/app/pages, src/app/shared)
    ├── documents/, docs/                ← enunciados y documentación (docs/CI-CD-Render.md)
    ├── scripts/configurar-https.ps1
    ├── Dockerfile, azure-pipelines.yml
    └── .github/workflows/codeql.yml     ← NO se ejecuta (GitHub solo lee la .github de la raíz)
```

Ramas: `main`, `Develop` (integración) y `feature/*`; los cambios llegan por Pull Request. La rama de trabajo actual puede ser `refactor/arreglo_seguridad`: **no cambies de rama ni hagas push sin permiso**.

## 3. Pila tecnológica

| Capa | Tecnología |
|---|---|
| Backend | Spring Boot 4.1.2, Java 21 (compilación), Maven con wrapper (`./mvnw`), Spring Web MVC, Spring Security, Spring Data MongoDB, Bean Validation, ZXing 3.5.3 (QR del TOTP) |
| Frontend | Angular 22 (componentes standalone), TypeScript 6, RxJS 7.8, pruebas con Vitest + jsdom (`ng test`) |
| Base de datos | MongoDB (Atlas en el despliegue) |
| Contenedor | `Dockerfile` de tres etapas; la imagen final ejecuta el JAR con un usuario sin root |
| CI/CD | Azure Pipelines (`azure-pipelines.yml`: pruebas, JaCoCo, Dependency-Check, `npm audit`, Gitleaks, SonarQube) y despliegue en Render |
| Externos | Brevo (correo transaccional), VirusTotal (opcional, desactivado por defecto) |

Spring Boot 4 / Spring Security 7 son muy recientes: **no des por supuesta una API por memoria**; comprueba su documentación o el código fuente de la dependencia cuando dudes. Los tests usan el paquete `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`.

## 4. Arquitectura del backend

Paquete base `es.uclm.esibuy.backend`:

| Paquete | Contenido |
|---|---|
| `controllers` | API REST y `@RestControllerAdvice` por área (`AuthExceptionHandler`, `TwoFactorExceptionHandler`, `RegistrationExceptionHandler`…). Cada manejador usa `assignableTypes` para limitarse a ciertos controladores; `RegistrationExceptionHandler` es global |
| `services` | Lógica de negocio y de seguridad |
| `dao` | Repositorios Spring Data (`MongoRepository`) y almacenes con `MongoTemplate` (`LoginAttemptStore`, `TotpSecurityStore`) |
| `model` | Documentos: `Usuario` (abstracta) → `Administrador`, `Cliente`, `Vendedor`; `Pedido`, `Producto`, `TokenRecuperacion`… |
| `dto` | `record` de petición y respuesta, con Bean Validation |
| `security` | `PepperedBCryptPasswordEncoder`, `SesionAbsolutaFilter`, `RolUsuario`, `ContextoAutenticacion` |
| `config` | `SecurityConfiguration`, `AsyncConfiguration`, conversores de cifrado de campo, inicializadores |
| `exceptions`, `validation`, `util` | Excepciones de dominio, `@Adult`, `EnmascaradorDatosPersonales` |

Convenciones de código que debes imitar: nombres de clases, métodos, variables y mensajes **en español**; DTO como `record`; excepciones de dominio con un manejador que devuelve `ApiErrorResponse`; ficheros con la indentación del fichero (hay mezcla de tabuladores y espacios: **no reformatees ficheros enteros**).

## 5. La seguridad que ya existe (piezas reutilizables)

| Pieza | Qué hace | Dónde |
|---|---|---|
| Contraseñas | bcrypt coste 12 sobre un HMAC-SHA256 con *pepper* (el codificador falla al arrancar sin pepper de ≥ 32 caracteres); historial de 5 en `Usuario.registrarContrasenaHash` | `PepperedBCryptPasswordEncoder`, `Usuario` |
| Política de contraseñas | ≥ 8, mayúscula, minúscula, dígito y símbolo, diccionario local de 1.000.000, sin datos personales, historial; `validate(password, personalData)` | `PasswordPolicy`, `resources/security/common-passwords.txt` |
| Límite de login | Ventanas en MongoDB (5 intentos / 5 min por IP+usuario, *backoff* 30 s → 2 → 4 → 5 min, modo adaptativo por IP). Método privado `reservarVentana`; claves seudonimizadas con HMAC; público `reservarEnvioOtp` | `LoginAttemptStore`, `LoginAttemptService` |
| Límite en memoria | Ventana deslizante con `Clock` inyectable (recuperación de contraseña) | `LimiteSolicitudesRecuperacion` |
| Sesión | Cookie `JSESSIONID` HttpOnly/Secure/SameSite=Lax, `changeSessionId` al autenticar, 30 min de inactividad, 8 h absolutas, `SessionRegistry` para cerrar sesiones (`cerrarSesiones` expira **todas** las del usuario) | `application.properties`, `AuthController.completarAutenticacion`, `SesionAbsolutaFilter`, `SesionService` |
| CSRF | Token en cookie `XSRF-TOKEN`; el frontend pide `GET /usuarios/csrf` y envía `X-XSRF-TOKEN` | `SecurityConfiguration`, servicios de Angular |
| 2FA y 3FA | TOTP (RFC 6238) con secreto cifrado y códigos de respaldo; código por correo con HMAC ligado a la sesión; obligatorios para ADMIN y VENDEDOR | `TotpService`, `EmailOtpService`, `RolUsuario`, `RespuestasTercerFactor` |
| Recuperación | Token de 32 bytes guardado como SHA-256, TTL, un solo uso atómico, respuesta uniforme, envío asíncrono | `RecuperacionContrasenaService`, `TokenRecuperacion`, `TokenRecuperacionDAO` |
| Cifrado de campo | AES-256-GCM para TOTP y para DNI/teléfono (conversor de propiedades de Mongo con AAD = nombre del campo) | `TotpCryptoService`, `DatosPersonalesCryptoService`, `DatosPersonalesMongoConfiguration` |
| Auditoría | Líneas de log `evento_seguridad=…` sin datos personales | `AuditoriaService` |
| Correo | Envío por la API de Brevo; patrón `@Async` | `BrevoEmailService`, `AsyncConfiguration` |
| Imágenes | Tamaño, firma real, extensión, `Content-Type`, marca de fin, nombre UUID, VirusTotal opcional | `ProductoImagenService`, `VirusTotalService`, `ProductoImagenConfiguration` |
| Enmascarado | DNI y teléfono enmascarados en las respuestas | `EnmascaradorDatosPersonales` |
| Autorización | Reglas por prefijo de ruta (`/cliente/**`, `/vendedor/**`, `/administrador/**`), `@PreAuthorize`, `anyRequest().authenticated()`; el propietario del dato sale de la sesión | `SecurityConfiguration` |

Anti-enumeración que **debe mantenerse**: registro con `202` uniforme (`RegistrationExceptionHandler`), recuperación con respuesta única y mensaje de login único.

### Trampas conocidas

- **Una ruta nueva del frontend se registra en tres sitios:** `app.routes.ts`, `SpaController` (reenvía a `index.html`) y la lista de rutas HTML permitidas de `SecurityConfiguration`.
- **Tests con roles:** las pruebas usan `roles(...)` unas 265 veces; cualquier cambio de autoridades puede romperlas.
- **`AuthServiceTests` y otras** construyen los servicios con `new Servicio(...)`: cambiar la firma de un constructor obliga a actualizar las pruebas.
- **Imágenes de prueba:** algunas pruebas usan cabeceras mínimas de PNG/JPG/GIF que `ImageIO` no decodifica.
- **El 2FA tiene varios estados de sesión pendientes** (`ESIBUY_2FA_*`, `ESIBUY_3FA_*`): no los mezcles con la sesión autenticada.

## 6. Frontend

Angular standalone con carpetas por funcionalidad en `src/app/pages` (login, register, perfil, carrito, checkout, pedidos, admin, usuarios, paneles…) y `src/app/shared` (cabecera, confirmación, modelos, texto). Rutas en `app.routes.ts` con `rolGuard` y `autenticadoGuard` (consultan la sesión real al backend). Cada servicio que hace `POST/PUT/DELETE` pide antes el token CSRF y lo envía en `X-XSRF-TOKEN` (ver `administrador.service.ts`). `marca-sesion.ts` usa `sessionStorage`. Las pruebas son `*.spec.ts` junto a cada fichero.

## 7. Pruebas y comandos

Todos desde `Proyecto_ISO_2627-main/backend` salvo que se indique.

| Qué | Comando |
|---|---|
| Una clase de prueba (rápido) | `./mvnw -q test -Dtest=NombreDeLaClaseTests` |
| Varias clases | `./mvnw -q test -Dtest='AuthServiceTests,PerfilControllerTests'` |
| Todo + cobertura (como el pipeline) | `./mvnw -B clean verify -Dtest='!BackendApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false` |
| Arrancar el backend | `./mvnw spring-boot:run` (necesita `backend/.env`, ver §8) |
| Frontend: pruebas (en `frontend/`) | `npm test -- --watch=false --coverage` |
| Frontend: build (en `frontend/`) | `npm run build` |

- `BackendApplicationTests` necesita MongoDB: **se excluye siempre**.
- La suite completa del backend tarda varios minutos: ejecútala en segundo plano y solo al cerrar cada tarea o fase. Durante el desarrollo usa las pruebas dirigidas.
- JaCoCo exige ≥ 60 % de líneas: el build falla por debajo.
- En el commit auditado (`9a8f5a7`): **1197 pruebas, 0 fallos, 14 omitidas, 89,9 % de líneas**. Mide la línea base actual en la Fase 0.

## 8. Entorno local

- **Sistema:** Windows 11 con Git Bash y PowerShell. Usa rutas con `/` en Git Bash.
- **Java:** el equipo tiene una versión superior a 21 (Java 23 en la auditoría); el proyecto compila con `java.version=21`.
- **Node:** el equipo tenía **22.14.0**, pero Angular CLI 22 exige **≥ 22.22.3** (o 24.15+/26+): con la versión antigua `npm test` y `ng build` no arrancan. Comprueba `node -v` en la Fase 0 y, si es insuficiente, pide al usuario que lo actualice; mientras, trabaja solo el backend y deja el frontend verificado por inspección.
- **Docker:** disponible; sirve para Gitleaks y Semgrep.
- **`backend/.env` y `.certs/`** contienen secretos locales y están ignorados por Git: **no los leas, no los copies, no los imprimas**.
- **HTTPS local:** backend en `https://localhost:8443`, frontend (`ng serve`) en `https://localhost:4200`; `scripts/configurar-https.ps1` prepara el certificado.

### Variables de entorno (solo nombres; los valores son secretos)

`MONGODB_URI`, `FRONTEND_ORIGIN`, `APP_FRONTEND_URL`, `PORT`, `SSL_ENABLED`, `SSL_KEY_STORE`, `SSL_KEY_STORE_PASSWORD`, `SESSION_COOKIE_SECURE`, `APP_SECURITY_PASSWORD_PEPPER`, `APP_SECURITY_EMAIL_OTP_KEY`, `TOTP_ENCRYPTION_KEY`, `PERSONAL_DATA_ENCRYPTION_KEY`, `PERSONAL_DATA_PREVIOUS_ENCRYPTION_KEY`, `PERSONAL_DATA_MIGRATE`, `PERSONAL_DATA_ROTATE`, `TOTP_MIGRATE_KEY`, `APP_PRODUCTOS_IMAGENES_ALMACENAMIENTO`, `VIRUSTOTAL_API_KEY`, `VIRUSTOTAL_ENABLED`, `VIRUSTOTAL_FAIL_CLOSED`, `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`. Si una tarea añade variables nuevas, documéntalas en `docs/CI-CD-Render.md` y avisa al usuario de que hay que configurarlas en Render y en su `.env`.

## 9. Estado de la auditoría

La auditoría original (commit `9a8f5a7`) dio: **RQ-01 a RQ-19 → 7 Sí, 9 Parcial, 1 No y 2 de verificación manual**, y 49 criterios detallados (26 Sí, 16 Parcial, 5 No, 2 de verificación manual). Los ficheros largos están en `auditoria/primera_auditoria/` (`resultado-auditoria.md`, 2000+ líneas, con el fragmento de código de cada criterio). **No lo leas entero**: usa `Grep` para ir al requisito que necesites (`### RQ-05`, `#### Rate limiting base`…).

**Desde la auditoría el código ha cambiado** (pago premium, procesar estado del pedido, stock/oferta de producto, baja de cliente con pedidos en curso, commit «auditorías y sonar»). Los números de línea de la auditoría ya no valen.


## 10. Glosario de identificadores

- **RQ-01 … RQ-19:** requisitos de la checklist de la práctica.
- **T-01 … T-37:** tareas derivadas de la auditoría. Las que implementa este chat son las 23 del plan; el resto las llevan otros miembros.
- **HdU:** historia de usuario.
- **AGR:** análisis y gestión de riesgos. **BP/28:** guía CCN-CERT. **MARISMA:** herramienta de AGR.
