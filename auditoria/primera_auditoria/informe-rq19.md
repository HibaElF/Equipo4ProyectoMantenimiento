# Informe de análisis de código asistido por IA (RQ-19) – ESIBuy

- **Versión analizada:** rama `main`, commit `9a8f5a7`
- **Fecha del informe:** 18/11/2026
- **Rutas:** relativas a `Proyecto_ISO_2627-main/`. Los fragmentos están copiados literalmente del repositorio (solo se ha quitado la sangría común).
- **Fuente de datos:** `auditoria/semgrep.sarif` (SARIF 2.1.0, Semgrep OSS 1.184.0).

> **Resultado del análisis con Semgrep: 0 hallazgos.** El SARIF contiene 563 reglas cargadas, **0 resultados**, la ejecución figura como correcta (`executionSuccessful: true`) y no hay avisos de error. Por tanto no hay vulnerabilidades de Semgrep que tabular y no se ha inventado ninguna. Dos cautelas:
>
> 1. El SARIF no registra qué ficheros se analizaron, así que "0 hallazgos" no demuestra por sí solo que se cubriera todo el código. Cómo comprobarlo, en el apartado 2.2.
> 2. Semgrep se lanzó a mano en local: no está integrado en el flujo de desarrollo (apartado 1), que es lo que pide el RQ-19.
>
> Los apartados 3 y 4 recogen, de forma provisional, hallazgos de la revisión de código asistida por IA (Claude Code) hecha en la auditoría. No son salida de Semgrep ni de CodeQL, y el equipo decide si los incluye en la memoria.

## 1. Herramientas e integración en el flujo de desarrollo

| Herramienta | Versión | Configuración | Integración | Fecha del análisis | Resultados |
|---|---|---|---|---|---|
| Semgrep OSS | 1.184.0 (`semanticVersion` del SARIF) | 563 reglas del registro de Semgrep, de varios lenguajes: java 64, javascript 63, typescript 10, yaml 23, dockerfile 4, generic 15, más otras (python 147, terraform 60…) que no aplican a este proyecto | Ejecución manual en local mediante Docker (`semgrep/semgrep`). No hay workflow, pre-commit ni paso en el pipeline | 18/11/2026 09:42 (hora local). **Aviso:** el SARIF no incluye `startTimeUtc`; la fecha es la de modificación del fichero | 0 hallazgos |
| CodeQL (GitHub Code Scanning) | `github/codeql-action` v3.38.3, consultas `security-extended` | Java (compilación con Maven) y TypeScript, en push, pull request y semanal | Workflow definido, pero **no se ejecuta** en este repositorio (ver más abajo) | Sin datos | No |
| Copilot Autofix | — | Sin evidencia en el repositorio | — | Sin datos | No |
| Visor SARIF de VS Code | — | `sarif-viewer.connectToGithubCodeScanning: on` | IDE | — | — |
| Claude Code (revisión de código asistida por IA) | modelo Claude Fable 5.2 | Revisión puntual durante la auditoría | **No integrada en el flujo** (ni CI ni pre-commit) | 16/11/2026 | Sí (apartado 3) |

Las reglas de Semgrep que se cargaron incluyen las específicas de este stack, por ejemplo `java.spring.security.audit.*` (11 reglas de Spring) y `javascript.angular.*` (3 reglas de Angular), además de las generales de Java (45) y TypeScript/JavaScript.

Configuración de CodeQL:

`.github/workflows/codeql.yml:4-10`

```yaml
on:
  push:
    branches: [main, develop, 'feature/**', 'release/**']
  pull_request:
    branches: [main, develop, 'feature/**', 'release/**']
  schedule:
    - cron: '0 3 * * 1'   # Semanal: lunes a las 03:00 UTC
```

`.github/workflows/codeql.yml:40-45`

```yaml
- name: Inicializar CodeQL
  uses: github/codeql-action/init@9f759ee644a3e7c15c1390abf49868036c00067b # v3.38.3
  with:
    languages: ${{ matrix.language }}
    build-mode: ${{ matrix.build-mode }}
    queries: security-extended
```

`.vscode/settings.json:7`

```json
"sarif-viewer.connectToGithubCodeScanning": "on"
```

### Problema de integración de CodeQL

El workflow está en `Proyecto_ISO_2627-main/.github/workflows/codeql.yml`. GitHub Actions solo ejecuta los workflows de `.github/workflows/` en la **raíz** del repositorio, y en la raíz de `Equipo4ProyectoMantenimiento` esa carpeta no existe (la carpeta `.github` de la raíz solo contiene `modernize/java-upgrade`, scripts de hooks). Salvo que Code Scanning esté activado por la configuración por defecto desde la web de GitHub, CodeQL no se está ejecutando aquí. Si se mueve, hay que ajustar `working-directory: backend` a `Proyecto_ISO_2627-main/backend`.

## 2. Vulnerabilidades principales

### 2.1 Detectadas por Semgrep

| ID | Fecha | Herramienta | Vulnerabilidad (CWE) | Ubicación | Severidad | Propuesta de corrección | Decisión del equipo | Justificación | Estado |
|---|---|---|---|---|---|---|---|---|---|
| — | 18/11/2026 | Semgrep OSS 1.184.0 | Sin hallazgos (0 resultados en `semgrep.sarif`) | — | — | No aplica | No aplica | No aplica | — |

### 2.2 Comprobación de cobertura del análisis

Lo que **sí** muestra el SARIF: la ejecución fue correcta, sin errores de análisis ni ficheros omitidos notificados, y se cargaron reglas de Java, Spring, TypeScript, Angular, YAML y Dockerfile.

Lo que **no** muestra: la lista de ficheros analizados, de modo que no se puede confirmar que entraran los `.java` de `backend/src/main` y los `.ts` de `frontend/src`. Para dejarlo documentado en la memoria, se recomienda repetir el análisis guardando también la salida JSON, que sí incluye `paths.scanned`, y comprobar que figuran esos ficheros (desde la raíz del repositorio, PowerShell):

```bash
docker run --rm -v "${PWD}:/src" semgrep/semgrep semgrep scan --config auto --json -o auditoria/semgrep.json Proyecto_ISO_2627-main/backend/src Proyecto_ISO_2627-main/frontend/src
```

Interpretación: las reglas de Semgrep OSS son de coincidencia de patrones y no suelen detectar fallos de lógica o de configuración como los del apartado 3 (por ejemplo, la diferencia de tiempos en el login o la falta de caducidad de contraseñas). Que Semgrep no devuelva nada es coherente con un código que ya evita los patrones típicos (sin `$where`, consultas parametrizadas, sin `innerHTML`), pero no equivale a que no haya vulnerabilidades.

## 3. Hallazgos de la revisión asistida por IA (Claude Code) – provisional

Como Semgrep no ha devuelto resultados, esta es la única tabla con hallazgos. Criterio de selección de la skill: todas las críticas y altas (no hay ninguna) y las medias que afectan a autenticación, sesión, datos sensibles o secretos. La severidad es una estimación de la auditoría, no una puntuación `security-severity` de una herramienta. Los hallazgos de severidad baja (H-08 a H-14) están en `auditoria/resultado-auditoria.md`, apartado 4.

| ID | Fecha | Herramienta | Vulnerabilidad (CWE) | Ubicación | Severidad | Propuesta de corrección | Decisión del equipo | Justificación | Estado |
|---|---|---|---|---|---|---|---|---|---|
| IA-01 | 16/11/2026 | Claude Code | Enumeración de usuarios por tiempo de respuesta en el login (CWE-208) | `backend/…/services/AuthService.java:50-51` | Media | Calcular siempre un bcrypt, usando un hash señuelo cuando el usuario no existe | [PENDIENTE – decidir: Corregir / Falso positivo / Riesgo aceptado] | [PENDIENTE] | Abierta |
| IA-02 | 16/11/2026 | Claude Code | Mensajes de error internos devueltos al cliente (CWE-209) | `backend/…/controllers/RegistrationExceptionHandler.java:110-114` | Media | Usar una excepción de dominio para los errores de validación y responder con mensaje genérico al resto; añadir manejador general | [PENDIENTE – decidir: Corregir / Falso positivo / Riesgo aceptado] | [PENDIENTE] | Abierta |
| IA-03 | 16/11/2026 | Claude Code | Sin caducidad de contraseña ni cambio en sesión (CWE-262) | `backend/…/model/Usuario.java:111-120` | Media | Guardar la fecha del último cambio, exigir renovación a los 30 días y añadir el cambio de contraseña autenticado | [PENDIENTE – decidir: Corregir / Falso positivo / Riesgo aceptado] | [PENDIENTE] | Abierta |
| IA-04 | 16/11/2026 | Claude Code | Registro público sin límite de peticiones y excluido de CSRF (CWE-770, CWE-352) | `backend/…/config/SecurityConfiguration.java:96-100` | Media | Limitar altas por IP reutilizando el almacén de intentos y quitar la exclusión de CSRF | [PENDIENTE – decidir: Corregir / Falso positivo / Riesgo aceptado] | [PENDIENTE] | Abierta |
| IA-05 | 16/11/2026 | Claude Code | Registro de auditoría insuficiente y sin protección (CWE-778) | `backend/…/services/AuditoriaService.java` | Media | Logs JSON con usuario, IP, endpoint, User-Agent y correlationId; persistir los eventos de auditoría | [PENDIENTE – decidir: Corregir / Falso positivo / Riesgo aceptado] | [PENDIENTE] | Abierta |
| IA-06 | 16/11/2026 | Claude Code | Credenciales de MongoDB posiblemente expuestas y sin rotar (CWE-522) | `docs/CI-CD-Render.md:249` | Media (Alta si se confirma) | Rotar las credenciales, confirmar la rotación y escanear también el historial de Git | [PENDIENTE – decidir: Corregir / Falso positivo / Riesgo aceptado] | [PENDIENTE] | Abierta |
| IA-07 | 16/11/2026 | Claude Code | Un único usuario de MongoDB con todos los privilegios; TLS y SCRAM sin forzar (CWE-250, CWE-319) | `backend/src/main/resources/application.properties:5-7` | Media | Separar usuario de aplicación y de migración, y forzar TLS y SCRAM-SHA-256 en la URI | [PENDIENTE – decidir: Corregir / Falso positivo / Riesgo aceptado] | [PENDIENTE] | Abierta |

## 4. Detalle de cada hallazgo

### IA-01 – Enumeración de usuarios por tiempo de respuesta (CWE-208)

`backend/src/main/java/es/uclm/esibuy/backend/services/AuthService.java:47-58`

```java
Usuario usuario = usuarioDAO.findByEmail(correoNormalizado)
        .orElse(null);

if (usuario == null || usuario.getContrasenaHash() == null
        || !passwordEncoder.matches(contrasena, usuario.getContrasenaHash())) {
    int retryAfter = loginAttemptService.registrarFallo(correoNormalizado);
    auditoriaService.registrarIntentoLoginFallido();
    if (retryAfter > 0) {
        auditoriaService.registrarBloqueoLogin(retryAfter);
        throw new LoginRateLimitException(retryAfter);
    }
    throw new BadCredentialsException(MENSAJE_ERROR_CREDENCIALES);
```

**Problema:** la condición usa cortocircuito. Si `usuario == null`, `passwordEncoder.matches` no se ejecuta y la respuesta llega sin el coste de bcrypt (coste 12, del orden de cientos de milisegundos). Midiendo el tiempo se distingue un correo registrado de uno que no lo está, aunque el mensaje sea el mismo.

**Propuesta:** generar al arrancar un hash señuelo con el mismo `PasswordEncoder` y, cuando el usuario no exista o no tenga hash, ejecutar `passwordEncoder.matches(contrasena, hashSeñuelo)` antes de fallar, de modo que ambos caminos cuesten lo mismo.

**¿Falso positivo?** No parece. El rate limiting (5 intentos cada 5 minutos por IP y usuario, y el modo adaptativo a partir de 20 usuarios por IP) reduce mucho la velocidad de explotación, pero no elimina la diferencia. Riesgo de la corrección: el login de correos inexistentes pasa a consumir CPU; ya está cubierto por el mismo rate limiting.

### IA-02 – Mensajes de error internos devueltos al cliente (CWE-209)

`backend/src/main/java/es/uclm/esibuy/backend/controllers/RegistrationExceptionHandler.java:110-114`

```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<ApiErrorResponse> handleInvalidQuery(IllegalArgumentException exception) {
	return ResponseEntity.badRequest()
			.body(new ApiErrorResponse(exception.getMessage()));
}
```

**Problema:** el manejador es global (`@RestControllerAdvice` sin restricción) y devuelve `exception.getMessage()` de cualquier `IllegalArgumentException`, no solo de las que lanza el propio código con mensajes pensados para el usuario. Las que lancen Spring, el driver de MongoDB u otras librerías dentro de un controlador también llegan al cliente con su texto interno. No hay un manejador general para el resto de excepciones.

**Propuesta:** crear una excepción de dominio (por ejemplo `DatosNoValidosException`) para los errores de validación propios y devolver su mensaje; para `IllegalArgumentException` genérica responder 400 con un texto fijo y registrar el detalle en el log; añadir un `@ExceptionHandler(Exception.class)` que devuelva 500 con mensaje genérico.

**¿Falso positivo?** Parcialmente: la mayoría de las `IllegalArgumentException` actuales son mensajes funcionales propios, así que el impacto real hoy es bajo. Riesgo de la corrección: hay bastantes `throw new IllegalArgumentException(...)` en los servicios (AdministradorService, DatosRolUsuario, TotpService, ProductoImagenService…) que habría que migrar para no perder los mensajes de validación que usa el frontend.

### IA-03 – Sin caducidad de contraseña ni cambio en sesión (CWE-262)

`backend/src/main/java/es/uclm/esibuy/backend/model/Usuario.java:111-120`

```java
public void registrarContrasenaHash(String contrasenaHash) {
	this.contrasenaHash = contrasenaHash;
	if (historialContrasenasHash == null) {
		historialContrasenasHash = new ArrayList<>();
	}
	historialContrasenasHash.add(0, contrasenaHash);
	if (historialContrasenasHash.size() > 5) {
		historialContrasenasHash = new ArrayList<>(historialContrasenasHash.subList(0, 5));
	}
}
```

**Problema:** al registrar una contraseña solo se actualiza el hash y el historial; no se guarda cuándo se cambió, por lo que es imposible aplicar la caducidad de 30 días que piden las aclaraciones del enunciado. Tampoco existe un endpoint para que el usuario autenticado cambie su contraseña.

**Propuesta:** añadir a `Usuario` un campo con la fecha del último cambio y actualizarlo en `registrarContrasenaHash`; en `AuthService.autenticar`, si han pasado más de 30 días, no abrir sesión normal y obligar a cambiar la contraseña; añadir `PUT /usuarios/contrasena` (contraseña actual + nueva, política e historial, rotación del identificador de sesión).

**¿Falso positivo?** No: es un criterio explícito del enunciado. Riesgo de la corrección: las cuentas existentes no tienen fecha; hay que decidir un valor inicial (por ejemplo la fecha de despliegue) para no bloquear a todos los usuarios a la vez.

### IA-04 – Registro público sin límite de peticiones y excluido de CSRF (CWE-770, CWE-352)

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:96-100`

```java
.csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository)
                .ignoringRequestMatchers(
                                "/cliente/register",
                                "/vendedor/register"))
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ClienteController.java:58-62`

```java
@PostMapping("/register")
public ResponseEntity<RegistroPublicoResponse> register(@Valid @RequestBody RegistroClienteRequest request) {
        clienteService.registrar(request);
        return ResponseEntity.accepted().body(RegistroPublicoResponse.confirmacion());
}
```

**Problema:** cada alta ejecuta un bcrypt de coste 12 y crea un documento de usuario pendiente, sin ningún límite por IP. Un cliente automatizado puede consumir CPU y llenar la colección de cuentas pendientes. Además los dos endpoints están fuera de la protección CSRF.

**Propuesta:** aplicar un límite por IP (por ejemplo 5 altas cada 15 minutos) reutilizando el mecanismo de ventanas de `LoginAttemptStore` y respondiendo 429 con `Retry-After`; eliminar `ignoringRequestMatchers` para el registro.

**¿Falso positivo?** No. Antes de quitar la exclusión de CSRF hay que comprobar que el frontend pide el token (`GET /usuarios/csrf`) antes de enviar el formulario de registro; si no, el registro dejaría de funcionar.

### IA-05 – Registro de auditoría insuficiente y sin protección (CWE-778)

`backend/src/main/java/es/uclm/esibuy/backend/services/AuditoriaService.java:15-21`

```java
public void registrarIntentoLoginFallido() {
    LOGGER.warn("evento_seguridad=login_fallido resultado=credenciales_invalidas");
}

public void registrarBloqueoLogin(int retryAfterSeconds) {
    LOGGER.warn("evento_seguridad=login_bloqueado retry_after_segundos={}", retryAfterSeconds);
}
```

**Problema:** los eventos son texto plano sin usuario, IP, endpoint, User-Agent ni identificador de correlación, y solo se escriben en la salida estándar. No se registran el login correcto, los cambios de 2FA/3FA, los bloqueos hechos por un administrador ni las modificaciones de usuarios. Con esto no se puede reconstruir un incidente ni generar alertas.

**Propuesta:** activar el formato JSON de logs y un filtro que rellene el MDC con correlationId, IP, User-Agent, endpoint y usuario seudonimizado; ampliar `AuditoriaService` con los eventos que faltan; persistir la auditoría en una colección de solo inserción o enviarla a un sistema externo.

**¿Falso positivo?** No. Riesgo de la corrección: no introducir en los logs datos personales en claro (el código actual los evita a propósito); usar identificadores o valores seudonimizados.

### IA-06 – Credenciales de MongoDB posiblemente expuestas y sin rotar (CWE-522)

`docs/CI-CD-Render.md:249`

```markdown
Se deben rotar las credenciales de MongoDB que hayan podido quedar expuestas durante las pruebas.
```

`azure-pipelines.yml:168-169`

```yaml
docker run --rm -v "$(Build.SourcesDirectory):/repo" \
  ghcr.io/gitleaks/gitleaks:v8.24.3 detect --source /repo --no-git --redact --verbose
```

**Problema:** la documentación del equipo anterior reconoce que las credenciales de MongoDB pudieron quedar expuestas durante las pruebas y deja pendiente su rotación. No hay evidencia de que se haya hecho. Además, Gitleaks se ejecuta con `--no-git`, es decir, solo sobre los ficheros actuales y no sobre el historial de commits.

**Propuesta:** rotar el usuario y la contraseña de MongoDB Atlas y actualizar `MONGODB_URI` en el despliegue; dejar constancia de la fecha; ejecutar Gitleaks también sobre el historial (sin `--no-git`).

**¿Falso positivo?** No se puede determinar desde el código: en los ficheros versionados no hay ninguna credencial (comprobado), pero la exposición pudo ocurrir fuera del repositorio. Debe confirmarlo el equipo.

### IA-07 – Un único usuario de MongoDB; TLS y SCRAM sin forzar (CWE-250, CWE-319)

`backend/src/main/resources/application.properties:5-7`

```properties
spring.mongodb.uri=${MONGODB_URI}
spring.mongodb.database=esibuy
spring.mongodb.auto-index-creation=true
```

**Problema:** toda la aplicación usa una sola cadena de conexión, también para las migraciones de cifrado y para crear índices (`auto-index-creation=true`), lo que obliga a que el usuario de ejecución tenga más privilegios de los necesarios. El mecanismo de autenticación y el cifrado en tránsito dependen por completo del valor de la variable de entorno.

**Propuesta:** crear en Atlas un usuario de aplicación con `readWrite` solo sobre `esibuy` y otro de migración usado únicamente en el despliegue; desactivar `auto-index-creation` en producción y crear los índices con el usuario de migración; exigir `mongodb+srv://` o `tls=true` y `authMechanism=SCRAM-SHA-256` en la URI, y validarlo al arrancar.

**¿Falso positivo?** Parcialmente: si la URI es de Atlas, TLS y SCRAM ya se aplican por defecto. Lo que sí es cierto en cualquier caso es el usuario único. Requiere la verificación manual en Atlas indicada en `auditoria/resultado-auditoria.md`, apartado 5.

## 5. Resultados

| Fuente | Fecha | Crítica | Alta | Media | Baja | Total |
|---|---|---|---|---|---|---|
| Semgrep OSS 1.184.0 | 18/11/2026 | 0 | 0 | 0 | 0 | 0 |
| CodeQL | sin datos | sin datos | sin datos | sin datos | sin datos | sin datos |
| Revisión asistida por IA (Claude Code) | 16/11/2026 | 0 | 0 | 7 | 6 (más 1 informativa) | 14 |

Comprobación complementaria de dependencias: `npm audit` en `frontend/` (16/11/2026) → 0 vulnerabilidades.

No hay comparación antes/después porque solo existe un análisis por herramienta.

## 6. Pendiente del equipo

1. **Confirmar la cobertura de Semgrep** repitiendo el análisis con salida JSON (apartado 2.2) y revisar que `paths.scanned` incluye el código del backend y del frontend. Conservar `semgrep.sarif` (y el JSON) como evidencia junto a la fecha.
2. **Integrar una herramienta en el flujo de desarrollo**, que es lo que exige el RQ-19. Dos opciones, no excluyentes:
   - Mover el workflow de CodeQL a `.github/workflows/` de la raíz (ajustando las rutas) o activar Code Scanning desde la web de GitHub. Los resultados quedan en Security → Code scanning, con CWE, severidad y Copilot Autofix.
   - Añadir Semgrep al pipeline (un paso en `azure-pipelines.yml` o un workflow de GitHub que use la imagen `semgrep/semgrep`).
3. **Decidir si los hallazgos IA-01 a IA-07 entran en la memoria** y, si entran, **rellenar la decisión del equipo y la justificación** de cada fila tras revisar y entender cada caso. El RQ-19 exige que las recomendaciones de la IA no se acepten automáticamente; por eso esas columnas se dejan sin rellenar.
4. Guardar la evidencia de Copilot Autofix (capturas de la propuesta y del cambio finalmente aplicado) si se utiliza.
5. Redactar el informe final de resultados del RQ-19 para la memoria con los datos de este documento y, cuando existan, los de CodeQL.
