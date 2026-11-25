# Auditoría de requisitos de seguridad – ESIBuy

- **Práctica:** Seguridad de Sistemas Software · P1 – Sistema web de comercio electrónico
- **Versión auditada:** rama `main`, commit `9a8f5a7` (código recibido para la fase de mantenimiento, sin modificar)
- **Fecha:** 16/11/2026
- **Alcance:** backend Spring Boot 4.1.2 / Java 21 (`backend/`), frontend Angular 22 (`frontend/`), configuración (`application.properties`, `pom.xml`, `Dockerfile`, `azure-pipelines.yml`, `.github/workflows/codeql.yml`) y conexión a MongoDB.
- **Rutas:** todas son relativas a `Proyecto_ISO_2627-main/`. Los fragmentos están copiados literalmente del repositorio (solo se ha quitado la sangría común); el rango `ruta:líneas` indica de dónde.
- **Estados:** **Sí** (todos los criterios con evidencia) · **Parcial** (falta algún criterio o la prueba documental) · **No** (sin implementación; se indica qué se ha buscado) · **Verificación manual** (depende de algo externo al código).

**Totales RQ-01 a RQ-19:** 7 Sí · 9 Parcial · 1 No · 2 Verificación manual.
**Totales criterios detallados (49):** 26 Sí · 16 Parcial · 5 No · 2 Verificación manual.

> Nota: en el checklist Word entregado antes (solo tres estados) RQ-08 figuraba como "Sí" y RQ-11 como "Parcial"; aquí pasan a "Verificación manual" porque su prueba no está en el código.

## 1. Tabla resumen

| RQ | Requisito | Estado | Evidencia principal (ruta) |
|---|---|---|---|
| RQ-01 | Identificación con usuario y contraseña mediante RBAC | Sí | `backend/…/config/SecurityConfiguration.java`, `…/services/AuthService.java` |
| RQ-02 | Registro, listas, valoraciones, perfil y suscripción | Sí | `…/controllers/ClienteController.java`, `ListasProductosController.java`, `PedidoController.java`, `PerfilController.java` |
| RQ-03 | Gestión de contenidos, estadísticas y valoraciones | Parcial | `…/controllers/VendedorController.java`, `…/dao/UsuarioConsultaDAOImpl.java` |
| RQ-04 | Gestión de usuarios solo para administrador | Parcial | `…/controllers/AdministradorController.java`, `…/services/AdministradorService.java` |
| RQ-05 | Política de contraseñas segura | Parcial | `…/services/PasswordPolicy.java`, `…/model/Usuario.java` |
| RQ-06 | Registro seguro y recuperación de contraseñas | Parcial | `…/services/ClienteService.java`, `SoporteRegistro.java` |
| RQ-07 | Control y seguridad de sesión | Sí | `application.properties`, `…/controllers/AuthController.java`, `…/security/SesionAbsolutaFilter.java` |
| RQ-08 | Accesible desde cualquier navegador | Verificación manual | `frontend/src/index.html`, `frontend/package.json` |
| RQ-09 | Conexión segura HTTPS | Sí (despliegue: verificación manual) | `application.properties`, `frontend/angular.json` |
| RQ-10 | Protección de información sensible en BBDD | Sí | `…/security/PepperedBCryptPasswordEncoder.java`, `…/services/DatosPersonalesCryptoService.java`, `TotpCryptoService.java` |
| RQ-11 | 0 defectos/vulnerabilidades bloqueantes y críticos | Verificación manual | `azure-pipelines.yml`, `backend/sonar-project.properties` |
| RQ-12 | AGR ISO 27001:2022 | No | — (no existe documento en el repositorio) |
| RQ-13 | Cobertura > 60 % y sin código muerto | Parcial | `backend/pom.xml`, `frontend/angular.json` |
| RQ-14 | Uso de Sonar y SonarLint | Parcial | `backend/sonar-project.properties`, `.vscode/settings.json`, `azure-pipelines.yml` |
| RQ-15 | Principios CCN-CERT BP/28 y buenas prácticas | Parcial | varias (ver sección) |
| RQ-16 | 2FA y 3FA | Sí | `…/services/TotpService.java`, `EmailOtpService.java`, `…/security/RolUsuario.java` |
| RQ-17 | Medidas de seguridad a nivel de BBDD | Parcial | `application.properties`, `…/dao/LoginAttemptStore.java` |
| RQ-18 | Recuperación segura de contraseña | Sí | `…/services/RecuperacionContrasenaService.java`, `…/dao/TokenRecuperacionDAO.java` |
| RQ-19 | Análisis de código asistido por IA | Parcial | `.github/workflows/codeql.yml` |

## 2. Requisitos generales

### RQ-01 – Identificación con usuario y contraseña mediante patrón RBAC

**Estado:** Sí

**Cómo se implementa:** El login es `POST /usuarios/login` con correo y contraseña; `AuthService.autenticar` aplica el rate limiting, busca al usuario y compara la contraseña con el `PasswordEncoder`. El rol (ADMIN, CLIENTE o VENDEDOR) se deriva del tipo de documento del usuario (`RolUsuario.de`) y se guarda en el contexto de seguridad como `ROLE_x`. `SecurityConfiguration` restringe cada prefijo de la API a un rol y termina con `anyRequest().authenticated()` (denegación por defecto); los controladores de administración y perfil añaden `@PreAuthorize`. El frontend replica el control en las rutas con `rolGuard`, que consulta la sesión real al backend.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:220-232`

```java
.requestMatchers(
                "/cliente/**")
.hasRole("CLIENTE")

.requestMatchers(
                "/vendedor/**")
.hasRole("VENDEDOR")

.requestMatchers(
                "/administrador/**")
.hasRole(ROL_ADMIN)

.anyRequest().authenticated();
```

`backend/src/main/java/es/uclm/esibuy/backend/security/RolUsuario.java:16-27`

```java
public static String de(Usuario usuario) {
    if (usuario instanceof Administrador) {
        return "ADMIN";
    }
    if (usuario instanceof Cliente) {
        return "CLIENTE";
    }
    if (usuario instanceof Vendedor) {
        return "VENDEDOR";
    }
    throw new IllegalStateException("Tipo de usuario no soportado para el inicio de sesión.");
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/AuthService.java:40-58`

```java
String correoNormalizado = correo.trim().toLowerCase(Locale.ROOT);
try {
    loginAttemptService.reservarIntento(ip, correoNormalizado);
} catch (LoginRateLimitException exception) {
    auditoriaService.registrarBloqueoLogin(exception.getRetryAfterSeconds());
    throw exception;
}
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

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AdministradorController.java:106-109`

```java
@PreAuthorize("hasRole('ADMIN')")
@PostMapping("/register")
public ResponseEntity<RegistroUsuarioResponse> register(
		@Valid @RequestBody RegistroAdministradorRequest request) {
```

`frontend/src/app/pages/login/rol.guard.ts:8-32`

```typescript
export const rolGuard: CanActivateFn = (ruta) => {
  const servicioAutenticacion = inject(AuthService);
  const enrutador = inject(Router);
  const rolPermitido = ruta.data['rol'];

  return servicioAutenticacion.obtenerSesionActual().pipe(
    map((sesion) =>
      sesion.role === rolPermitido
        ? true
        : enrutador.parseUrl(rutaParaRol(sesion.role))
    ),
    catchError(() =>
      of(
        enrutador.createUrlTree(
          ['/login'],
          {
            queryParams: {
              motivo: motivoSinSesion()
            }
          }
        )
      )
    )
  );
};
```

### RQ-02 – Registro, gestión de listas, valoraciones, perfil y suscripción

**Estado:** Sí

**Cómo se implementa:** Clientes y vendedores se registran por endpoints públicos (`/cliente/register`, `/vendedor/register`). Cualquier usuario autenticado gestiona sus listas de productos en `/usuarios/listas` (crear, renombrar, eliminar, añadir y quitar productos). El cliente valora productos de sus pedidos, consulta y edita su perfil (`/usuarios/perfil`) y cambia su suscripción premium (`PUT /cliente/tipo`).

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ClienteController.java:58-62`

```java
@PostMapping("/register")
public ResponseEntity<RegistroPublicoResponse> register(@Valid @RequestBody RegistroClienteRequest request) {
        clienteService.registrar(request);
        return ResponseEntity.accepted().body(RegistroPublicoResponse.confirmacion());
}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ClienteController.java:78-84`

```java
@PutMapping("/tipo")
public ResponseEntity<PerfilResponse> cambiarTipo(
                Authentication authentication,
                @Valid @RequestBody CambiarTipoClienteRequest request) {
        clienteService.cambiarTipoCliente(authentication.getName(), request.esPremium());
        return ResponseEntity.ok(perfilService.consultarPerfil(authentication.getName()));
}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ListasProductosController.java:39-45`

```java
@PostMapping
public ResponseEntity<ListaProductosResponse> crear(
        Authentication authentication,
        @Valid @RequestBody NombreListaRequest request) {

    return ResponseEntity.status(HttpStatus.CREATED)
            .body(listaProductosService.crear(authentication.getName(), request.nombre()));
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PedidoController.java:67-80`

```java
@PostMapping("/{pedidoId}/productos/{productoId}/valoraciones")
public ResponseEntity<ValoracionResponse> valorarProducto(
        @PathVariable String pedidoId,
        @PathVariable String productoId,
        @Valid @RequestBody CrearValoracionRequest request,
        Authentication authentication) {
    var valoracion = valoracionService.valorar(
            authentication.getName(),
            pedidoId,
            productoId,
            request.puntuacion(),
            request.comentario());
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(ValoracionResponse.de(valoracion));
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PerfilController.java:56-65`

```java
@PreAuthorize("isAuthenticated()")
@PutMapping("/perfil")
public ResponseEntity<PerfilResponse> modificarPerfil(
        Authentication authentication,
        @RequestBody ModificarUsuarioRequest request) {

    return ResponseEntity.ok(
            perfilService.modificarPerfil(
                    authentication.getName(),
                    request));
```

**Qué falta / mejoras:** no existe cambio de contraseña desde el perfil (solo recuperación por correo); el propio frontend lo indica en `frontend/src/app/pages/perfil/perfil.html:347`.

### RQ-03 – Gestión de contenidos, estadísticas y valoraciones

**Estado:** Parcial

**Cómo se implementa:** El vendedor gestiona sus productos (crear, modificar, activar, desactivar, eliminar) en `/vendedor/productos`; el administrador gestiona categorías y consulta todos los productos en solo lectura. Las únicas estadísticas son contadores de usuarios que acompañan al listado del administrador. Las valoraciones de un producto solo las puede consultar el cliente.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/VendedorController.java:56-63`

```java
@PostMapping("/productos")
public ResponseEntity<CrearProductoResponse> crearProducto(
        Authentication authentication,
        @Valid @RequestPart("producto") CrearProductoRequest request,
        @RequestPart(value = "imagen", required = false) MultipartFile imagen) {
    CrearProductoResponse response = productoService.crearProducto(authentication.getName(), request, imagen);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/UsuarioConsultaDAOImpl.java:89-95`

```java
public EstadisticasUsuariosResponse obtenerEstadisticas() {
	long total = mongoTemplate.count(new Query(), Usuario.class);
	long activos = contarEstado(Criteria.where(CAMPO_ACTIVADA).is(true).and(CAMPO_BLOQUEADA).is(false));
	long pendientes = contarEstado(Criteria.where(CAMPO_ACTIVADA).is(false).and(CAMPO_BLOQUEADA).is(false));
	long desactivados = contarEstado(Criteria.where(CAMPO_BLOQUEADA).is(true));
	return new EstadisticasUsuariosResponse(total, activos, pendientes, desactivados);
}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ValoracionesProductoController.java:26-32`

```java
@GetMapping("/{productoId}/valoraciones")
public ValoracionesProductoResponse consultarValoraciones(
        @PathVariable String productoId,
        Authentication authentication) {
    productoService.consultarDetalleParaCliente(authentication.getName(), productoId);
    return valoracionService.consultarValoracionesProducto(productoId);
}
```

**Qué falta / mejoras:**
- Estadísticas de uso (ventas, pedidos, productos más valorados…): no existen. Buscado: `estadistic`, `Estadisticas` en controladores y servicios → solo `EstadisticasUsuariosResponse`.
- Consulta de valoraciones por vendedor y administrador: no existe. Buscado `valoracion` en `VendedorController`, `PedidosVendedorController` y `AdministradorController` → sin resultados; el único endpoint está bajo `/cliente/**` (rol CLIENTE).

### RQ-04 – Módulo de gestión de usuarios solo para administrador

**Estado:** Parcial

**Cómo se implementa:** Todo el módulo cuelga de `/administrador/**`, restringido a `ROLE_ADMIN` por ruta y por `@PreAuthorize` en cada método. Permite crear administradores (únicamente administradores), listar con filtros y paginación, ver el detalle, modificar, activar, bloquear y desbloquear (cerrando las sesiones del usuario bloqueado). La eliminación solo existe para administradores, con protección contra autoeliminación y contra borrar al último.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AdministradorController.java:144-154`

```java
@PreAuthorize("hasRole('ADMIN')")
@PatchMapping("/usuarios/{id}/bloquear")
public ResponseEntity<Void> bloquearUsuario(
		@PathVariable String id,
		Authentication authentication) {

	administradorService.bloquearUsuario(
			id,
			authentication.getName());

	return ResponseEntity
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AdministradorController.java:129-139`

```java
@PreAuthorize("hasRole('ADMIN')")
@DeleteMapping("/{id}")
public ResponseEntity<Void> eliminarAdministrador(
		@PathVariable String id,
		Authentication authentication) {

	administradorService.eliminarAdministrador(
			id,
			authentication.getName());

	return ResponseEntity
```

`backend/src/main/java/es/uclm/esibuy/backend/services/AdministradorService.java:383-408`

```java
Administrador objetivo =
		administradorDAO.findById(id)
				.orElseThrow(
						UsuarioNoEncontradoException::new);

String emailNormalizado =
		emailSolicitante
				.trim()
				.toLowerCase(Locale.ROOT);

if (emailNormalizado.equals(
		objetivo.getEmail())) {

	throw new AutoEliminacionAdministradorException();
}

if (administradorDAO
		.contarAdministradores() <= 1) {

	throw new UltimoAdministradorException();
}

administradorDAO.delete(objetivo);
auditoriaService.registrarEliminacionUsuarioPorAdministrador("ADMINISTRADOR");

sesionService.cerrarSesiones(
```

**Qué falta / mejoras:**
- **Eliminar clientes y vendedores:** no implementado. El único borrado del módulo usa `administradorDAO.findById`, por lo que un id de cliente o vendedor devuelve 404. Buscado `@DeleteMapping` en `AdministradorController` → una sola coincidencia (la mostrada); en el frontend (`frontend/src/app/pages/usuarios/`) no hay acción de eliminar usuario.
- `PUT /administrador/usuarios/{id}` recibe `@RequestBody ModificarUsuarioRequest` sin `@Valid`; la validación es manual y no limita la longitud de nombre y apellidos.

### RQ-05 – Política de contraseñas segura

**Estado:** Parcial

**Cómo se implementa:** `PasswordPolicy` exige al menos 8 caracteres con mayúscula, minúscula, dígito y símbolo; rechaza las contraseñas de un diccionario local de 1.000.000 de entradas (comparando también la variante alfanumérica y sin dígitos finales) y las que contienen datos personales o el nombre de la aplicación. `Usuario` conserva el hash de las 5 últimas contraseñas y la recuperación impide reutilizarlas. El hash es bcrypt de coste 12 con pepper (ver RQ-10).

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:43-63`

```java
public void validate(String password, Collection<String> personalData) {
	if (password == null || password.codePointCount(0, password.length()) < 8
			|| !contains(password, Character::isUpperCase)
			|| !contains(password, Character::isLowerCase)
			|| !contains(password, Character::isDigit)
			|| !containsSpecial(password)) {
		throw new InvalidRegistrationException(
				CAMPO_CONTRASENA,
				"La contraseña debe tener al menos 8 caracteres e incluir mayúsculas, minúsculas, números y símbolos.");
	}

	String normalizedPassword = normalize(password);
	String alphanumericPassword = normalizedPassword.replaceAll("[^\\p{L}\\p{N}]+", "");
	String passwordWithoutTrailingDigits = quitarNumerosFinales(alphanumericPassword);
	if (commonPasswords.contains(normalizedPassword)
			|| commonPasswords.contains(alphanumericPassword)
			|| commonPasswords.contains(passwordWithoutTrailingDigits)) {
		throw new InvalidRegistrationException(
				CAMPO_CONTRASENA,
				"La contraseña no puede contener términos de la lista de contraseñas comunes.");
	}
```

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

`backend/src/main/java/es/uclm/esibuy/backend/services/RecuperacionContrasenaService.java:126-140`

```java
passwordPolicy.validate(nuevaContrasena);

List<String> hashesRecientes =
        new ArrayList<>(usuario.getHistorialContrasenasHash());
String hashActual = usuario.getContrasenaHash();
if (hashActual != null && !hashesRecientes.contains(hashActual)) {
    hashesRecientes.add(hashActual);
}

if (passwordPolicy.matchesRecentPassword(
        nuevaContrasena, hashesRecientes, passwordEncoder)) {
    throw new InvalidRegistrationException(
            "nuevaContrasena",
            "No puedes reutilizar una de tus contraseñas recientes.");
}
```

**Qué falta / mejoras:**
- **Caducidad a 30 días:** no implementada. Buscado en `backend/src/main` y `frontend/src`: `caducidadContrasena`, `passwordExpir`, `fechaCambioContrasena`, `ultimoCambio`, `30 días`, `Duration.ofDays(30` → sin resultados. `Usuario` no guarda la fecha del último cambio.
- No hay cambio de contraseña para el usuario autenticado.
- En la recuperación se llama a `passwordPolicy.validate(nuevaContrasena)` sin datos personales (línea mostrada arriba), a diferencia del registro.

### RQ-06 – Registro de usuario seguro y recuperación de contraseñas

**Estado:** Parcial

**Cómo se implementa:** El registro valida la petición con Bean Validation y con `PasswordPolicy` (pasando los datos personales), normaliza el correo, guarda la contraseña con bcrypt+pepper y crea la cuenta como no activada: un administrador debe activarla. Si el correo ya existe se responde igualmente `202` con el mismo cuerpo, para no revelar cuentas existentes. La recuperación de contraseña está implementada (ver RQ-18).

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/services/ClienteService.java:71-81`

```java
soporteRegistro.validarSolicitud(
		request,
		request.contrasena(),
		request.nombre(),
		request.apellidos(),
		request.email(),
		request.fechaNacimiento() == null
				? null
				: request.fechaNacimiento().format(FORMATO_FECHA_IDENTIFICATIVA),
		request.telefono(),
		request.dniNif());
```

`backend/src/main/java/es/uclm/esibuy/backend/services/ClienteService.java:94-96`

```java
cliente.setBloqueada(false);
cliente.setActivada(false);
cliente.registrarContrasenaHash(soporteRegistro.codificarContrasena(request.contrasena()));
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/RegistrationExceptionHandler.java:32-35`

```java
@ExceptionHandler(CorreoYaRegistradoException.class)
public ResponseEntity<RegistroPublicoResponse> handlePublicDuplicateEmail() {
	return ResponseEntity.accepted().body(RegistroPublicoResponse.confirmacion());
}
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:96-100`

```java
.csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository)
                .ignoringRequestMatchers(
                                "/cliente/register",
                                "/vendedor/register"))
```

**Qué falta / mejoras:**
- Sin rate limiting en el registro. Buscado `LoginAttempt`, `Limite` en `ClienteService`, `VendedorService` y `SoporteRegistro` → sin resultados.
- `/cliente/register` y `/vendedor/register` están excluidos de la protección CSRF (fragmento anterior).
- No se verifica la propiedad del correo (no hay enlace de confirmación); la activación depende del administrador.
- `nombre`, `apellidos`, `telefono` e `imagenPerfil` no tienen longitud máxima ni formato en `RegistroClienteRequest`.

### RQ-07 – Control y seguridad de sesión

**Estado:** Sí

**Cómo se implementa:** Sesión de servidor con cookie `JSESSIONID` marcada HttpOnly, Secure y SameSite=Lax. Al completar la autenticación se rota el identificador (`changeSessionId`), se fija el timeout de inactividad a 30 minutos y se anota el instante de inicio; `SesionAbsolutaFilter` invalida la sesión a las 8 horas aunque haya actividad. CSRF se protege con token en cookie y cabecera `X-XSRF-TOKEN`. Las sesiones se registran en un `SessionRegistry`, lo que permite cerrarlas todas al bloquear al usuario, eliminarlo o restablecer su contraseña.

**Evidencia:**

`backend/src/main/resources/application.properties:26-32`

```properties
server.servlet.session.timeout=30m
app.security.session.absolute-timeout=8h
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.same-site=lax

app.security.cookies.secure=${SESSION_COOKIE_SECURE:true}
server.servlet.session.cookie.secure=${SESSION_COOKIE_SECURE:true}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthController.java:374-387`

```java
private void completarAutenticacion(
        Usuario usuarioValidado,
        HttpServletRequest request,
        HttpServletResponse response) {
    HttpSession sesion = request.getSession(true);
    request.changeSessionId();
    sesion.setMaxInactiveInterval(30 * 60);
    ContextoAutenticacion.marcarInicioSesion(sesion);
    sesionService.registrarSesion(sesion.getId(), usuarioValidado.getEmail());

    var context = ContextoAutenticacion.crear(usuarioValidado.getEmail(), obtenerRol(usuarioValidado));
    ContextoAutenticacion.establecer(context);
    securityContextRepository.saveContext(context, request, response);
}
```

`backend/src/main/java/es/uclm/esibuy/backend/security/SesionAbsolutaFilter.java:55-58`

```java
if (!Instant.now().isBefore(autenticadaEn.plus(timeoutAbsoluto))) {
	expirarSesion(sesion, response);
	return;
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/SesionService.java:22-28`

```java
public void cerrarSesiones(String email) {
	if (email == null || email.isBlank()) {
		return;
	}
	sessionRegistry.getAllSessions(normalizar(email), false)
			.forEach(SessionInformation::expireNow);
}
```

**Qué falta / mejoras:** timeouts idénticos para todos los roles; sesiones concurrentes ilimitadas (`maximumSessions(-1)` en `SecurityConfiguration.java`); el registro de sesiones es en memoria (no sirve con varias instancias).

### RQ-08 – Accesible desde cualquier navegador

**Estado:** Verificación manual

**Cómo se implementa:** El frontend es una SPA Angular 22 que Spring Boot sirve como recursos estáticos. Usa HTML5, CSS y las API estándar del framework; no se han visto API propietarias de un navegador.

**Evidencia:**

`frontend/src/index.html:1-8`

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>ESIBuy</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
```

**Qué falta / mejoras:** la compatibilidad no se demuestra con código. No hay `browserslist` ni pruebas e2e multinavegador (buscado `browserslist`, `playwright`, `cypress` en `frontend/package.json` → sin resultados). Hace falta la captura indicada en la sección 5.

### RQ-09 – Conexión segura HTTPS

**Estado:** Sí (en el código y en local). El certificado del despliegue es de verificación manual.

**Cómo se implementa:** El backend arranca con TLS activado en el puerto 8443, protocolos TLS 1.2 y 1.3 y un keystore PKCS12 cuya ruta y contraseña vienen de variables de entorno. El servidor de desarrollo de Angular también usa SSL. Hay tests que comprueban la negociación TLS, la cabecera HSTS, las cookies Secure y que el puerto no acepta HTTP sin cifrar. En Render el TLS lo termina la plataforma (`SSL_ENABLED=false` dentro del contenedor, con `forward-headers-strategy=native`).

**Evidencia:**

`backend/src/main/resources/application.properties:12-24`

```properties
server.port=${PORT:8443}
server.address=0.0.0.0

# HTTPS local, desactivable cuando Render termina TLS
server.ssl.enabled=${SSL_ENABLED:true}
server.ssl.key-store=${SSL_KEY_STORE:file:../.certs/localhost.p12}
server.ssl.key-store-password=${SSL_KEY_STORE_PASSWORD:}
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=esibuy
server.ssl.enabled-protocols=TLSv1.2,TLSv1.3

# Reconocer HTTPS cuando hay un proxy inverso delante
server.forward-headers-strategy=native
```

`frontend/angular.json:65-67`

```json
"ssl": true,
"sslCert": "../.certs/localhost.pem",
"sslKey": "../.certs/localhost-key.pem"
```

`backend/src/test/java/es/uclm/esibuy/backend/config/HttpsTransportTests.java:119`

```java
assertTrue(response.headers().firstValue("Strict-Transport-Security").isPresent());
```

`backend/src/test/java/es/uclm/esibuy/backend/config/HttpsTransportTests.java:149`

```java
void noAceptaPeticionesHttpSinCifrarEnElPuertoDeLaApi() throws Exception {
```

**Qué falta / mejoras:** en local el certificado es autofirmado (`scripts/configurar-https.ps1`); no hay redirección HTTP→HTTPS (buscado `requiresChannel`, `requiresSecure` → sin resultados; el puerto HTTP no se abre).

### RQ-10 – Protección de información sensible en BBDD

**Estado:** Sí

**Cómo se implementa:** Las contraseñas se guardan con bcrypt (coste 12, salt único) aplicado sobre un HMAC-SHA256 con pepper. El secreto TOTP se cifra con AES-256-GCM e IV aleatorio; los códigos de respaldo se guardan con bcrypt y el token de recuperación como SHA-256. El DNI/NIF y el teléfono se cifran con AES-256-GCM mediante conversores de propiedad de Spring Data, con el nombre del campo como dato autenticado y soporte de rotación de clave. De los métodos de pago solo se guarda un token simulado y una referencia enmascarada.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:37-41`

```java
@Bean
PasswordEncoder passwordEncoder(
                @Value("${app.security.password.pepper:}") String pepper) {
        return new PepperedBCryptPasswordEncoder(pepper, 12);
}
```

`backend/src/main/java/es/uclm/esibuy/backend/security/PepperedBCryptPasswordEncoder.java:51-57`

```java
private String pepperedMaterial(CharSequence rawPassword) {
    try {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
        byte[] digest = mac.doFinal(rawPassword.toString().getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(digest);
    } catch (java.security.GeneralSecurityException exception) {
```

`backend/src/main/java/es/uclm/esibuy/backend/services/DatosPersonalesCryptoService.java:68-76`

```java
Cipher cifrador = Cipher.getInstance("AES/GCM/NoPadding");
cifrador.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(claveActual, "AES"),
        new GCMParameterSpec(128, iv));
cifrador.updateAAD(campo.getBytes(StandardCharsets.UTF_8));
byte[] cifrado = cifrador.doFinal(valor.getBytes(StandardCharsets.UTF_8));
return PREFIJO_CIFRADO
        + Base64.getEncoder().encodeToString(iv)
        + ":"
        + Base64.getEncoder().encodeToString(cifrado);
```

`backend/src/main/java/es/uclm/esibuy/backend/config/DatosPersonalesMongoConfiguration.java:34-38`

```java
registro.registerConverter(Cliente.class, CAMPO_TELEFONO, converter);
registro.registerConverter(Vendedor.class, CAMPO_TELEFONO, converter);
registro.registerConverter(Administrador.class, CAMPO_TELEFONO, converter);
registro.registerConverter(Cliente.class, "dniNif", converter);
registro.registerConverter(Vendedor.class, "dniNif", converter);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpCryptoService.java:53-60`

```java
public String cifrar(String value) {
    try {
        byte[] iv = new byte[IV_LENGTH];
        secureRandom.nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(iv) + ":" + Base64.getEncoder().encodeToString(encrypted);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/PagoSimuladoService.java:108-115`

```java
private String enmascarar(String codigoTipo, String dato) {
	return switch (codigoTipo) {
		case TipoMetodoPago.CODIGO_TARJETA -> "**** **** **** " + dato.substring(dato.length() - 4);
		case TipoMetodoPago.CODIGO_PAYPAL -> dato.charAt(0) + "***" + dato.substring(dato.indexOf('@'));
		case TipoMetodoPago.CODIGO_BIZUM -> "******" + dato.substring(dato.length() - 3);
		default -> throw new IllegalStateException("Tipo de método de pago no soportado.");
	};
}
```

**Qué falta / mejoras:** nombre, apellidos, correo, fecha de nacimiento, direcciones y titular del pago se guardan en claro; los datos anteriores al cifrado solo se cifran si se ejecuta la migración (`PERSONAL_DATA_MIGRATE=true`), porque `descifrar` devuelve tal cual los valores sin prefijo `enc:v1:`.

### RQ-11 – 0 defectos/bugs/vulnerabilidades bloqueantes y críticos

**Estado:** Verificación manual

**Cómo se implementa:** El pipeline de Azure ejecuta SonarQube sobre backend y frontend, OWASP Dependency-Check (falla con CVSS ≥ 9), `npm audit` con umbral crítico y Gitleaks; GitHub Actions ejecuta CodeQL. El número real de incidencias bloqueantes y críticas solo se puede ver en el panel de Sonar, que no está en el repositorio.

**Evidencia:**

`backend/pom.xml:181`

```xml
<failBuildOnCVSS>9</failBuildOnCVSS>
```

`azure-pipelines.yml:144`

```yaml
- script: npm audit --audit-level=critical
```

`azure-pipelines.yml:194-204`

```yaml
- script: sonar-scanner
  workingDirectory: backend
  displayName: 'Analizar Backend'
  env:
    SONAR_TOKEN: $(SQ_TOKEN)

- script: sonar-scanner
  workingDirectory: frontend
  displayName: 'Analizar Frontend'
  env:
    SONAR_TOKEN: $(SQ_TOKEN)
```

**Comprobado en esta auditoría:** `npm audit` en `frontend/` → `found 0 vulnerabilities`. En la revisión manual del código no se han encontrado vulnerabilidades que se clasificarían como bloqueantes o críticas (ver hallazgos en la sección 4).

**Qué falta / mejoras:** captura del Quality Gate de Sonar con 0 bloqueantes y 0 críticos del proyecto propio (la clave configurada, `2026-g01-backend`, es la del equipo anterior).

### RQ-12 – Análisis y Gestión de Riesgos (ISO 27001:2022)

**Estado:** No

**Qué se ha buscado:** `marisma`, `27001`, `AGR`, `análisis de riesgos` en todos los `.md`, `.yml`, `.txt` y `.json` del repositorio → sin resultados relevantes. Las carpetas `documents/` y `docs/` solo contienen los enunciados, las historias de usuario y tareas de los sprints, el catálogo de patrones y `docs/CI-CD-Render.md`.

**Qué falta / mejoras:** el AGR completo con MARISMA (activos, amenazas, riesgo, controles del Anexo A de ISO/IEC 27001:2022 y plan de tratamiento). Si el equipo lo tiene fuera del repositorio, debe aportarse (sección 5).

### RQ-13 – Cobertura de pruebas > 60 % y sin código muerto

**Estado:** Parcial

**Cómo se implementa:** El backend usa JaCoCo con una regla que hace fallar el build por debajo del 60 % de líneas. El frontend usa Vitest con umbrales del 60 % de sentencias y líneas en `angular.json`. El pipeline ejecuta ambos.

**Evidencia:**

`backend/pom.xml:149-168`

```xml
	<id>check</id>
	<phase>verify</phase>
	<goals>
		<goal>check</goal>
	</goals>
	<configuration>
		<rules>
			<rule>
				<element>BUNDLE</element>
				<limits>
					<limit>
						<counter>LINE</counter>
						<value>COVEREDRATIO</value>
						<minimum>0.60</minimum>
					</limit>
				</limits>
			</rule>
		</rules>
	</configuration>
</execution>
```

`frontend/angular.json:83-86`

```json
"coverageThresholds": {
  "statements": 60,
  "lines": 60
}
```

**Comprobado en esta auditoría (ejecución local):** `./mvnw -B clean verify -Dtest='!BackendApplicationTests'` → 1197 tests, 0 fallos, 0 errores, 14 omitidos; JaCoCo: 89,9 % de líneas, 90,3 % de instrucciones, 76,3 % de ramas (`backend/target/site/jacoco/jacoco.csv`). `BackendApplicationTests` se excluye porque necesita MongoDB, igual que en el pipeline.

**Qué falta / mejoras:**
- Cobertura del frontend sin verificar: `npm test` no arranca en el equipo de auditoría (Node 22.14.0; Angular CLI exige ≥ 22.22.3). Hay 39 ficheros `.spec.ts`.
- Código no utilizado en producción:

`backend/src/main/java/es/uclm/esibuy/backend/controllers/MetodoPagoController.java:55-57`

```java
public List<MetodoPagoResponse> consultarMetodosPago(Authentication authentication) {
	return pagoSimuladoService.consultarMetodosPago(authentication.getName());
}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ClienteController.java:54-56`

```java
public ClienteController(ClienteService clienteService, ProductoService productoService) {
        this(clienteService, productoService, null);
}
```

  El primer método es público pero no tiene mapeo HTTP y solo lo llaman los tests (igual que `PagoSimuladoService.consultarMetodosPago`). Hay más constructores "para tests" en `ClienteService` y `ProductoImagenService`. `MongoUserDetailsService` no interviene en el login real (la autenticación la hace `AuthService`). En `backend/uploads/productos/` hay 5 imágenes de prueba versionadas.

### RQ-14 – Uso de Sonar y SonarLint

**Estado:** Parcial

**Cómo se implementa:** El backend tiene `sonar-project.properties` (con el informe de JaCoCo) y el pipeline ejecuta `sonar-scanner` en backend y frontend. SonarLint está configurado en modo conectado en la configuración de VS Code del repositorio.

**Evidencia:**

`backend/sonar-project.properties:1-4`

```properties
sonar.host.url=http://seralu4.esi.uclm.es:1521/

sonar.projectKey=2026-g01-backend
sonar.projectName=2026-g01-backend
```

`.vscode/settings.json:3-6`

```json
"sonarlint.connectedMode.project": {
    "connectionId": "http-seralu4-esi-uclm-es-1521-",
    "projectKey": "2026-g01-backend"
},
```

**Qué falta / mejoras:**
- Falta `frontend/sonar-project.properties` (comprobado: el fichero no existe), aunque el pipeline ejecuta `sonar-scanner` en `frontend/`.
- La clave de proyecto y la conexión son las del equipo anterior (`2026-g01`).
- Sin evidencia de resultados: capturas del Quality Gate y de SonarLint en el IDE (sección 5).

### RQ-15 – Principios CCN-CERT BP/28 y buenas prácticas

**Estado:** Parcial

**Cómo se implementa:** No hay en el repositorio un documento que relacione los principios de BP/28 con el código; la relación siguiente es de esta auditoría y debe contrastarse con el listado oficial del documento.

| Principio / buena práctica | Medida encontrada | Estado |
|---|---|---|
| Mínimo privilegio y denegación por defecto | Rutas por rol y `anyRequest().authenticated()` (RQ-01); contenedor sin root | Sí |
| Defensa en profundidad | 3FA, rate limiting, cifrado de campo, CSRF, validación de subida | Sí |
| Fallo seguro | La aplicación no arranca sin pepper ni claves de cifrado válidas | Sí |
| Validación de entradas | Bean Validation en la mayoría de DTO (ver criterio 2.4) | Parcial |
| Gestión de secretos | Variables de entorno, `.env` ignorado, Gitleaks | Sí |
| Autenticación robusta y gestión de sesión | RQ-05, RQ-07, RQ-16 | Parcial (sin caducidad de contraseña) |
| Registro y auditoría | `AuditoriaService`, texto plano, sin contexto ni protección | Parcial |
| Gestión de errores | Manejadores por dominio; un manejador devuelve mensajes internos | Parcial |
| Cabeceras de seguridad | Valores por defecto de Spring Security; sin Content-Security-Policy | Parcial |
| Componentes actualizados | Dependency-Check, `npm audit`, acciones de GitHub fijadas por hash | Sí |
| Privacidad (RGPD) | Baja de cuenta, cifrado y enmascarado; sin documentación | Parcial |

**Evidencia:**

`Dockerfile:39-45`

```dockerfile
# Ejecutar sin privilegios de root
RUN groupadd --system esibuy \
    && useradd --system --gid esibuy esibuy \
    && mkdir -p /app/uploads/productos \
    && chown -R esibuy:esibuy /app

USER esibuy
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpCryptoService.java:39-41`

```java
if (encryptionKey == null || encryptionKey.isBlank()) {
    throw new IllegalStateException("TOTP_ENCRYPTION_KEY debe estar configurada.");
}
```

`backend/src/main/java/es/uclm/esibuy/backend/security/PepperedBCryptPasswordEncoder.java:20-22`

```java
if (pepper == null || pepper.length() < 32) {
    throw new IllegalArgumentException("APP_SECURITY_PASSWORD_PEPPER debe tener al menos 32 caracteres.");
}
```

**Qué falta / mejoras:** las carencias de los criterios detallados marcados como Parcial o No (sección 3) y un apartado en la memoria que relacione cada principio de BP/28 con su implementación.

### RQ-16 – Segundo (2FA) y tercer factor (3FA) de autenticación

**Estado:** Sí

**Cómo se implementa:** El segundo factor es TOTP (HMAC-SHA1, 6 dígitos, 30 s), compatible con Google Authenticator: el alta entrega un QR, el secreto se guarda cifrado, se acepta una ventana de ±1 paso, cada intervalo solo se puede usar una vez y se generan 8 códigos de respaldo. El tercer factor es un código de 6 dígitos enviado por correo, válido 10 minutos y guardado como HMAC. Para vendedores y administradores ambos son obligatorios: si no tienen TOTP, el login les fuerza el alta antes de dar la sesión. Para clientes son opcionales.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/security/RolUsuario.java:30-37`

```java
public static boolean requiereTotpObligatorio(Usuario usuario) {
    return usuario instanceof Vendedor
            || usuario instanceof Administrador;
}
public static boolean requiereTercerFactor(Usuario usuario) {
    return requiereTotpObligatorio(usuario)
            || (usuario instanceof Cliente && usuario.isTotpActivado() && usuario.isEmailOtpActivado());
}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthController.java:83-86`

```java
boolean necesitaAlta = !usuarioValidado.isTotpActivado()
        && requiereTotpObligatorio(usuarioValidado);

if (usuarioValidado.isTotpActivado() || necesitaAlta) {
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthController.java:249-258`

```java
if (RolUsuario.requiereTercerFactor(usuario)) {
    boolean codigoEmailEnviado = iniciarTercerFactor(usuario, sesion);
    return RespuestasTercerFactor.aceptado(new LoginResponse(
                    usuario.getEmail(),
                    obtenerRol(usuario),
                    false,
                    null,
                    false,
                    true,
                    codigoEmailEnviado));
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:105-117`

```java
private Long intervaloValido(String secret, String code) {
    String normalizedCode = normalizarCodigo(code);
    if (secret == null || normalizedCode == null || !normalizedCode.matches("\\d{6}")) {
        return null;
    }
    long currentStep = Instant.now().getEpochSecond() / STEP_SECONDS;
    for (long offset = -1; offset <= 1; offset++) {
        if (constantTimeEquals(generarCodigo(secret, currentStep + offset), normalizedCode)) {
            return currentStep + offset;
        }
    }
    return null;
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/EmailOtpService.java:61-66`

```java
public void iniciar(HttpSession sesion, String email) {
    String codigo = generarCodigo();
    String hmac = calcularHmac(sesion.getId(), email, codigo);
    Instant ahora = clock.instant();
    reservarEnvio(email, ahora);
    enviar(sesion, email, codigo);
```

### RQ-17 – Medidas de seguridad a nivel de BBDD

**Estado:** Parcial

**Cómo se implementa:** A nivel de datos hay cifrado de campo (RQ-10), hashes para todo lo que no necesita recuperarse y seudonimización con HMAC de las claves de la colección de intentos de login, de modo que un volcado de la base de datos no revela contraseñas, secretos TOTP, DNI, teléfonos ni qué correos o IP han fallado el login. Las consultas son parametrizadas (criterio 2.5). La documentación de despliegue dice que Atlas restringe el acceso por IP.

**Evidencia:**

`backend/src/main/resources/application.properties:5-7`

```properties
spring.mongodb.uri=${MONGODB_URI}
spring.mongodb.database=esibuy
spring.mongodb.auto-index-creation=true
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:259-267`

```java
private String fingerprint(String value) {
    try {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    } catch (GeneralSecurityException exception) {
        throw new IllegalStateException("No se pudo seudonimizar el estado de intentos.", exception);
    }
}
```

`docs/CI-CD-Render.md:153-157`

```markdown
### Acceso a MongoDB Atlas

Para que Spring Boot pudiera conectarse desde Render, se añadieron a la lista de acceso de MongoDB Atlas los rangos de direcciones de salida indicados en el panel del servicio.

De esta forma, se permitió la conexión desde Render sin autorizar indiscriminadamente todas las direcciones de Internet.
```

**Qué falta / mejoras:**
- La configuración del propio SGBD no está en el repositorio: la conexión es una única variable `MONGODB_URI`. Buscado `authMechanism`, `SCRAM`, `tls=`, `ssl=`, `mongodb://`, `mongodb+srv://`, `createUser`, `docker-compose` → sin resultados en código ni configuración.
- Un solo usuario de base de datos para la aplicación, las migraciones y la creación de índices (`auto-index-creation=true`).
- Sin evidencia de roles de mínimo privilegio, auditoría ni cifrado en reposo (sección 5).

### RQ-18 – Recuperación segura de contraseña

**Estado:** Sí

**Cómo se implementa:** Al solicitar la recuperación se genera un token de 32 bytes con `SecureRandom`, se borra cualquier token anterior del usuario y solo se guarda su SHA-256, con caducidad de 30 minutos e índice TTL. La respuesta es la misma exista o no el correo y el envío es asíncrono. Al completar, el token se consume de forma atómica dentro de una transacción, la contraseña nueva pasa la política y el historial, se cierran todas las sesiones y se registra el evento. Hay un límite de 3 solicitudes por correo y 10 por IP cada 15 minutos.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/services/RecuperacionContrasenaService.java:96-109`

```java
byte[] bytesToken = new byte[32];
secureRandom.nextBytes(bytesToken);

String token = Base64.getUrlEncoder().withoutPadding()
        .encodeToString(bytesToken);
Instant caducidad = Instant.now().plusSeconds(MINUTOS_VALIDEZ_TOKEN * 60);

tokenDAO.deleteByUsuarioId(usuario.getId());
tokenDAO.save(new TokenRecuperacion(
        calcularHash(token), usuario.getId(), caducidad));

String enlace = urlFrontend + "/recuperar-contrasena?token=" + token;
// Sin esperar a Brevo: el tiempo de respuesta no revela si el correo existe.
brevoEmailService.enviarRecuperacionEnSegundoPlano(usuario.getEmail(), enlace);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/RecuperacionContrasenaService.java:142-152`

```java
transaccion.executeWithoutResult(status -> {
    if (tokenDAO.consumirSiValido(tokenGuardado.getId(), ahora) != 1) {
        throw new TokenRecuperacionInvalidoException();
    }

    usuario.registrarContrasenaHash(passwordEncoder.encode(nuevaContrasena));
    usuarioDAO.save(usuario);
});

sesionService.cerrarSesiones(usuario.getEmail());
auditoriaService.registrarRestablecimientoContrasena(usuario.getId());
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/TokenRecuperacionDAO.java:19-21`

```java
@Query("{ '_id': ?0, 'consumido': false, 'caducidad': { '$gt': ?1 } }")
@Update("{ '$set': { 'consumido': true } }")
long consumirSiValido(String id, Instant ahora);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/LimiteSolicitudesRecuperacion.java:21-23`

```java
static final int MAXIMO_POR_CORREO = 3;
static final int MAXIMO_POR_IP = 10;
static final Duration VENTANA = Duration.ofMinutes(15);
```

**Qué falta / mejoras:** el límite de solicitudes está en memoria (se pierde al reiniciar y no se comparte entre instancias); no se pide el segundo factor para restablecer; la nueva contraseña no se compara con los datos personales.

### RQ-19 – Análisis de código asistido por IA

**Estado:** Parcial

**Cómo se implementa:** CodeQL está integrado en el flujo mediante GitHub Actions: se ejecuta en cada push y pull request a `main`, `develop`, `feature/**` y `release/**`, y semanalmente, para Java y TypeScript, con el conjunto de consultas `security-extended`. La configuración de VS Code conecta el visor SARIF con Code Scanning.

**Evidencia:**

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

**Qué falta / mejoras:**
- Registro de las vulnerabilidades principales (fecha, vulnerabilidad, severidad, propuesta de corrección, decisión del equipo) e informe final: no existen. Buscado ficheros `*.sarif` y documentos con `copilot autofix`, `semgrep`, `snyk` → sin resultados.
- Evidencia de que las propuestas de Copilot Autofix se revisan y no se aceptan automáticamente (sección 5).

## 3. Criterios detallados (aclaraciones)

### 3.1 Autenticación multifactor (3FA)

#### F1 – Contraseña: longitud ≥ 8, blacklist, caducidad (30 días) y no reutilizar las últimas 5 — **Parcial**

Longitud, lista negra e historial: sí. Caducidad: no implementada (ver RQ-05 para lo buscado).

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:44-48`

```java
if (password == null || password.codePointCount(0, password.length()) < 8
		|| !contains(password, Character::isUpperCase)
		|| !contains(password, Character::isLowerCase)
		|| !contains(password, Character::isDigit)
		|| !containsSpecial(password)) {
```

`backend/src/main/java/es/uclm/esibuy/backend/model/Usuario.java:117-119`

```java
if (historialContrasenasHash.size() > 5) {
	historialContrasenasHash = new ArrayList<>(historialContrasenasHash.subList(0, 5));
}
```

#### F1 – Bloqueo progresivo por intentos fallidos + rate limiting — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:28-35`

```java
private static final int WINDOW_SECONDS = 300;
private static final int EMAIL_OTP_WINDOW_SECONDS = 600;
private static final int MAX_EMAIL_OTP_SENDS = 5;
private static final int ACCOUNT_FAILURE_WINDOW_SECONDS = 600;
private static final int MAX_PAIR_ATTEMPTS = 5;
private static final int ADAPTIVE_USER_THRESHOLD = 20;
private static final int ADAPTIVE_DELAY_SECONDS = 2;
private static final int[] BACKOFF_SECONDS = { 30, 120, 240, 300 };
```

#### F2 – TOTP: secreto cifrado, QR de alta, tolerancia ±1 paso, códigos de respaldo — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:111-115`

```java
for (long offset = -1; offset <= 1; offset++) {
    if (constantTimeEquals(generarCodigo(secret, currentStep + offset), normalizedCode)) {
        return currentStep + offset;
    }
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:191-193`

```java
var backupCodes = generarCodigosRespaldo();
var hashes = backupCodes.stream().map(passwordEncoder::encode).toList();
String encrypted = cryptoService.cifrar(secret);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:238-240`

```java
public void guardarSecretoPendiente(Usuario usuario, String secret) {
    String encrypted = cryptoService.cifrar(secret);
    Instant expires = Instant.now().plusSeconds(600);
```

El QR se genera en `TotpService.generarQrDataUrl` (líneas 79-99) y hay 8 códigos de respaldo (`BACKUP_CODE_COUNT = 8`, línea 43).

#### F3 – Código de un solo uso por e-mail (10 min, almacenado como hash) — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/EmailOtpService.java:30-33`

```java
public static final int DURACION_RETO_SEGUNDOS = 10 * 60;
public static final int MAX_INTENTOS = 5;
public static final int MAX_ENVIOS = 3;
public static final int INTERVALO_REENVIO_SEGUNDOS = 60;
```

`backend/src/main/java/es/uclm/esibuy/backend/services/EmailOtpService.java:122-129`

```java
boolean codigoValido = formatoValido
        && MessageDigest.isEqual(
                HexFormat.of().parseHex(reto.hmac()),
                HexFormat.of().parseHex(calcularHmac(sesion.getId(), email, codigo)));
if (codigoValido) {
    limpiar(sesion);
    return ResultadoVerificacion.VALIDO;
}
```

El HMAC-SHA256 se guarda en la sesión de servidor, no en la base de datos.

#### Política por rol: Admin y Creador con 3FA obligatoria — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/security/RolUsuario.java:30-37`

```java
public static boolean requiereTotpObligatorio(Usuario usuario) {
    return usuario instanceof Vendedor
            || usuario instanceof Administrador;
}
public static boolean requiereTercerFactor(Usuario usuario) {
    return requiereTotpObligatorio(usuario)
            || (usuario instanceof Cliente && usuario.isTotpActivado() && usuario.isEmailOtpActivado());
}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PerfilController.java:100-104`

```java
if (usuario instanceof Vendedor || usuario instanceof Administrador) {
    throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "El segundo factor es obligatorio para este rol.");
}
```

#### Política por rol: Usuario con 3FA opcional e incentivo a activar F2 — **Parcial**

Opcional: sí. El incentivo se limita a un texto en el perfil; no hay aviso tras el login ni ventaja asociada.

`backend/src/main/java/es/uclm/esibuy/backend/services/PerfilService.java:63-66`

```java
if (activado && !usuario.isTotpActivado()) {
    throw new ResponseStatusException(
            HttpStatus.CONFLICT, "Activa primero el segundo factor TOTP.");
}
```

`frontend/src/app/pages/perfil/perfil.html:114-117`

```html
<p>Protege tu cuenta con Google Authenticator, Authy u otra aplicación compatible.</p>
<button class="boton-principal" type="button" (click)="configurarTOTP()" [disabled]="cargandoTOTP()">
  Configurar segundo factor
</button>
```

### 3.2 Defensa contra diccionario y credential stuffing

#### Contraseña ≥ 8 caracteres (recomendado 12+) — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:44-48`

```java
if (password == null || password.codePointCount(0, password.length()) < 8
		|| !contains(password, Character::isUpperCase)
		|| !contains(password, Character::isLowerCase)
		|| !contains(password, Character::isDigit)
		|| !containsSpecial(password)) {
```

No se exige el valor recomendado de 12.

#### Bloqueo de contraseñas de listas comunes — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:57-63`

```java
if (commonPasswords.contains(normalizedPassword)
		|| commonPasswords.contains(alphanumericPassword)
		|| commonPasswords.contains(passwordWithoutTrailingDigits)) {
	throw new InvalidRegistrationException(
			CAMPO_CONTRASENA,
			"La contraseña no puede contener términos de la lista de contraseñas comunes.");
}
```

El diccionario es `backend/src/main/resources/security/common-passwords.txt` (1.000.000 de líneas).

#### La contraseña no contiene datos personales — **Parcial**

En el registro sí; en la recuperación la validación se llama sin datos personales.

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:66-79`

```java
identifiers.add("ESIBuy");
if (personalData != null) {
	identifiers.addAll(personalData);
}
String normalizedPasswordIdentifiers = normalizeIdentifier(password);
boolean containsPersonalData = identifiers.stream()
		.filter(value -> value != null && !value.isBlank())
		.flatMap(value -> identifierTokens(value).stream())
		.anyMatch(normalizedPasswordIdentifiers::contains);
if (containsPersonalData) {
	throw new InvalidRegistrationException(
			CAMPO_CONTRASENA,
			"La contraseña no puede contener datos personales ni el nombre de la aplicación.");
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/RecuperacionContrasenaService.java:126`

```java
passwordPolicy.validate(nuevaContrasena);
```

#### Rate limiting base: máx. 5 intentos / 5 min por IP+usuario — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:66-70`

```java
String pairId = "par:" + fingerprint(ip + "\u0000" + email);
int pairWait = reservarVentana(pairId, now, WINDOW_SECONDS, MAX_PAIR_ATTEMPTS);
if (pairWait > 0) {
    return pairWait;
}
```

`WINDOW_SECONDS = 300` y `MAX_PAIR_ATTEMPTS = 5` (líneas 28 y 32).

#### Backoff exponencial por cuenta: 30 s → 2 min → 4 min → 5 min — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:35`

```java
private static final int[] BACKOFF_SECONDS = { 30, 120, 240, 300 };
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:108-115`

```java
int step = Math.min(account.getInteger(CAMPO_BACKOFF_STEP, 0), BACKOFF_SECONDS.length - 1);
Query lockable = Query.query(Criteria.where("_id").is(accountId)
        .and(CAMPO_BACKOFF_STEP).is(account.getInteger(CAMPO_BACKOFF_STEP, 0))
        .and(CAMPO_FAILURES).gte(MAX_PAIR_ATTEMPTS)
        .andOperator(new Criteria().orOperator(
                Criteria.where(CAMPO_LOCK_UNTIL).exists(false),
                Criteria.where(CAMPO_LOCK_UNTIL).lte(Date.from(now)))));
Instant lockUntil = now.plusSeconds(BACKOFF_SECONDS[step]);
```

#### Adaptativo por IP: 20 usuarios en 5 min → 2 intentos / 5 min + retraso fijo — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:73-80`

```java
int distinctUsers = registrarUsuarioIp(ipId, emailKey, now);
if (distinctUsers >= ADAPTIVE_USER_THRESHOLD) {
    int adaptiveWait = reservarCupoIpAdaptativo(ipId, now);
    if (adaptiveWait > 0) {
        return adaptiveWait;
    }
    return reservarRetrasoAdaptativo(ipId, now);
}
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:191-193`

```java
private int reservarCupoIpAdaptativo(String ipId, Instant now) {
    Query underLimit = Query.query(Criteria.where("_id").is(ipId)
            .and(CAMPO_ADAPTIVE_ATTEMPTS).lt(2));
```

`ADAPTIVE_USER_THRESHOLD = 20` y `ADAPTIVE_DELAY_SECONDS = 2` (líneas 33-34).

#### Respuesta HTTP 429 con cabecera Retry-After — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthExceptionHandler.java:22-27`

```java
@ExceptionHandler(LoginRateLimitException.class)
public ResponseEntity<ApiErrorResponse> manejarLimiteIntentos(LoginRateLimitException excepcion) {
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header("Retry-After", Integer.toString(excepcion.getRetryAfterSeconds()))
            .body(new ApiErrorResponse(excepcion.getMessage()));
}
```

#### Verificación de contraseñas filtradas en alta y cambio — **Sí**

Diccionario local (no k-anonymity), aplicado en el alta y en el restablecimiento.

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:27`

```java
ClassPathResource resource = new ClassPathResource("security/common-passwords.txt");
```

`backend/src/main/java/es/uclm/esibuy/backend/services/SoporteRegistro.java:61`

```java
politicaContrasenas.validate(contrasena, datosNoNulos);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/RecuperacionContrasenaService.java:126`

```java
passwordPolicy.validate(nuevaContrasena);
```

#### Hash Argon2id o bcrypt (cost 12–14) con salt único — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:37-41`

```java
@Bean
PasswordEncoder passwordEncoder(
                @Value("${app.security.password.pepper:}") String pepper) {
        return new PepperedBCryptPasswordEncoder(pepper, 12);
}
```

#### Pepper secreto global (env/keystore) — **Sí**

`backend/src/main/resources/application.properties:33`

```properties
app.security.password.pepper=${APP_SECURITY_PASSWORD_PEPPER:}
```

`backend/src/main/java/es/uclm/esibuy/backend/security/PepperedBCryptPasswordEncoder.java:51-57`

```java
private String pepperedMaterial(CharSequence rawPassword) {
    try {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
        byte[] digest = mac.doFinal(rawPassword.toString().getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(digest);
    } catch (java.security.GeneralSecurityException exception) {
```

El pepper se aplica con HMAC-SHA256 antes de bcrypt (en lugar de concatenarse). El mismo valor se reutiliza como clave HMAC en `LoginAttemptStore` (hallazgo H-10).

#### Comparación en tiempo constante — **Parcial**

Las comparaciones de códigos son en tiempo constante, pero cuando el usuario no existe no se calcula ningún hash, por lo que el tiempo de respuesta distingue correos registrados (hallazgo H-01).

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:283-286`

```java
private boolean constantTimeEquals(String expected, String actual) {
    return java.security.MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.US_ASCII), actual.getBytes(StandardCharsets.US_ASCII));
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/AuthService.java:50-51`

```java
if (usuario == null || usuario.getContrasenaHash() == null
        || !passwordEncoder.matches(contrasena, usuario.getContrasenaHash())) {
```

#### Alertas de intentos fallidos — **Parcial**

Solo hay eventos de log, sin usuario ni IP; no se notifica al usuario ni al administrador.

`backend/src/main/java/es/uclm/esibuy/backend/services/AuditoriaService.java:15-21`

```java
public void registrarIntentoLoginFallido() {
    LOGGER.warn("evento_seguridad=login_fallido resultado=credenciales_invalidas");
}

public void registrarBloqueoLogin(int retryAfterSeconds) {
    LOGGER.warn("evento_seguridad=login_bloqueado retry_after_segundos={}", retryAfterSeconds);
}
```

### 3.3 Gestión y control de sesión

#### Cookies con HttpOnly, Secure y SameSite — **Sí**

`backend/src/main/resources/application.properties:28-32`

```properties
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.same-site=lax

app.security.cookies.secure=${SESSION_COOKIE_SECURE:true}
server.servlet.session.cookie.secure=${SESSION_COOKIE_SECURE:true}
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:52-56`

```java
CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();

repository.setCookieCustomizer(cookie -> cookie.secure(cookieSeguro).sameSite("Lax"));

return repository;
```

La cookie `XSRF-TOKEN` es legible por JavaScript a propósito (patrón de doble envío).

#### Rotación del ID de sesión tras login correcto — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthController.java:87-95`

```java
HttpSession anterior = request.getSession(false);

if (anterior != null) {
    anterior.invalidate();
}

ContextoAutenticacion.limpiar();

HttpSession sesionPendiente = request.getSession(true);
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthController.java:378-380`

```java
HttpSession sesion = request.getSession(true);
request.changeSessionId();
sesion.setMaxInactiveInterval(30 * 60);
```

#### Rotación del ID de sesión al cambiar credenciales / subir privilegios — **Parcial**

Al restablecer la contraseña se cierran todas las sesiones; al activar o desactivar factores la sesión no se rota.

`backend/src/main/java/es/uclm/esibuy/backend/services/RecuperacionContrasenaService.java:151`

```java
sesionService.cerrarSesiones(usuario.getEmail());
```

`backend/src/main/java/es/uclm/esibuy/backend/services/PerfilService.java:67-68`

```java
usuario.setEmailOtpActivado(activado);
usuarioDAO.save(usuario);
```

#### Idle timeout 15–30 min — **Sí**

`backend/src/main/resources/application.properties:26`

```properties
server.servlet.session.timeout=30m
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthController.java:380`

```java
sesion.setMaxInactiveInterval(30 * 60);
```

Mismo valor para todos los roles.

#### Absolute timeout 8–12 h — **Sí**

`backend/src/main/resources/application.properties:27`

```properties
app.security.session.absolute-timeout=8h
```

`backend/src/main/java/es/uclm/esibuy/backend/security/SesionAbsolutaFilter.java:55-58`

```java
if (!Instant.now().isBefore(autenticadaEn.plus(timeoutAbsoluto))) {
	expirarSesion(sesion, response);
	return;
}
```

### 3.4 Endurecimiento de frontend y backend

#### HTTPS (TLS) con certificado válido — **Parcial**

TLS activo; en local el certificado es autofirmado y el del despliegue requiere verificación manual.

`backend/src/main/resources/application.properties:16-21`

```properties
server.ssl.enabled=${SSL_ENABLED:true}
server.ssl.key-store=${SSL_KEY_STORE:file:../.certs/localhost.p12}
server.ssl.key-store-password=${SSL_KEY_STORE_PASSWORD:}
server.ssl.key-store-type=PKCS12
server.ssl.key-alias=esibuy
server.ssl.enabled-protocols=TLSv1.2,TLSv1.3
```

`scripts/configurar-https.ps1:58-60`

```powershell
Invoke-OpenSsl -Arguments @('req', '-x509', '-newkey', 'rsa:3072', '-sha256', '-nodes', '-days', '365',
    '-keyout', $nextKey, '-out', $nextCertificate, '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1',
```

#### Validación de entrada en servidor — **Parcial**

Bean Validation en la mayoría de DTO, pero la modificación de usuario y perfil no usa `@Valid` y varios campos del registro no tienen límite.

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ClienteController.java:59`

```java
public ResponseEntity<RegistroPublicoResponse> register(@Valid @RequestBody RegistroClienteRequest request) {
```

`backend/src/main/java/es/uclm/esibuy/backend/dto/DireccionRequest.java:26-27`

```java
@NotBlank(message = "El código postal es obligatorio.")
@Pattern(regexp = "\\d{5}", message = "El código postal debe tener 5 dígitos.")
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PerfilController.java:60`

```java
@RequestBody ModificarUsuarioRequest request) {
```

`backend/src/main/java/es/uclm/esibuy/backend/dto/RegistroClienteRequest.java:13-14`

```java
@NotBlank String nombre,
@NotBlank String apellidos,
```

#### Codificación de salida según contexto (anti XSS) — **Sí**

Angular escapa toda interpolación. Buscado `innerHTML`, `outerHTML`, `bypassSecurityTrust`, `document.write`, `eval(` en `frontend/src` → sin resultados. La API solo devuelve JSON.

`frontend/src/app/pages/perfil/perfil.html:119`

```html
<p>{{ mensajeTOTP() }}</p>
```

`backend/src/main/java/es/uclm/esibuy/backend/config/ProductoImagenConfiguration.java:40`

```java
response.setHeader("X-Content-Type-Options", "nosniff");
```

Mejora: no hay Content-Security-Policy (buscado `Content-Security-Policy`, `contentSecurityPolicy` → sin resultados).

#### Rate limiting en peticiones (/login 5/5 min; /otp/send 3/h y 10/día; API 60 req/min) — **Parcial**

Login: sí (criterios 3.2). Envío de OTP: 5 cada 10 minutos por correo y 3 por reto, no 3/h y 10/día. Límite general de la API: no existe (buscado `bucket4j`, `resilience4j`, `RateLimiter` en `pom.xml` y código → sin resultados).

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:29-30`

```java
private static final int EMAIL_OTP_WINDOW_SECONDS = 600;
private static final int MAX_EMAIL_OTP_SENDS = 5;
```

`backend/src/main/java/es/uclm/esibuy/backend/services/EmailOtpService.java:32-33`

```java
public static final int MAX_ENVIOS = 3;
public static final int INTERVALO_REENVIO_SEGUNDOS = 60;
```

#### Errores genéricos al cliente, sin stack traces — **Parcial**

Los mensajes son funcionales y Spring Boot no incluye la traza por defecto (no se ha cambiado `server.error.*`). Pero un manejador global devuelve el mensaje de cualquier `IllegalArgumentException` y no hay manejador genérico (buscado `@ExceptionHandler(Exception.class)`, `RuntimeException.class`, `Throwable.class` → sin resultados).

`backend/src/main/java/es/uclm/esibuy/backend/controllers/RegistrationExceptionHandler.java:110-114`

```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<ApiErrorResponse> handleInvalidQuery(IllegalArgumentException exception) {
	return ResponseEntity.badRequest()
			.body(new ApiErrorResponse(exception.getMessage()));
}
```

#### Mapeo de excepciones a 400/401/403/404/409/429/5xx — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/RespuestasTercerFactor.java:51-59`

```java
case INVALIDO:
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(new ApiErrorResponse("El código de verificación no es válido."));
case BLOQUEADO:
    limpiarPendiente.run();
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(CABECERA_REINTENTO, Integer.toString(EmailOtpService.DURACION_RETO_SEGUNDOS))
            .body(new ApiErrorResponse(
                    "Se ha alcanzado el límite de intentos. Inicia sesión de nuevo más tarde."));
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/RegistrationExceptionHandler.java:104-108`

```java
@ExceptionHandler(ProductoAjenoException.class)
public ResponseEntity<ApiErrorResponse> handleForeignProduct(ProductoAjenoException exception) {
	return ResponseEntity.status(HttpStatus.FORBIDDEN)
			.body(new ApiErrorResponse(exception.getMessage()));
}
```

Hay manejadores para 400, 401, 403, 404, 409, 410, 429 y 503 repartidos en `controllers/*ExceptionHandler.java`.

#### Logs estructurados (JSON) con usuario, IP, endpoint, UA, correlationId y causa — **No**

Buscado `logback`, `logstash`, `MDC.`, `correlation`, `structured` en `backend/src/main` y `pom.xml` → sin resultados; en `backend/src/main/resources/` solo están `application.properties` y `security/`. Los eventos son texto plano sin contexto:

`backend/src/main/java/es/uclm/esibuy/backend/services/AuditoriaService.java:19-21`

```java
public void registrarBloqueoLogin(int retryAfterSeconds) {
    LOGGER.warn("evento_seguridad=login_bloqueado retry_after_segundos={}", retryAfterSeconds);
}
```

#### RBAC con mínimo privilegio y denegación por defecto — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:31`

```java
@EnableMethodSecurity
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:228-232`

```java
.requestMatchers(
                "/administrador/**")
.hasRole(ROL_ADMIN)

.anyRequest().authenticated();
```

#### Roles (USER, CREATOR, ADMIN) y permisos finos (authorities) — **Parcial**

Existen tres roles equivalentes (CLIENTE, VENDEDOR, ADMIN), pero cada usuario tiene una única autoridad `ROLE_x`; no hay permisos finos.

`backend/src/main/java/es/uclm/esibuy/backend/security/ContextoAutenticacion.java:24-31`

```java
public static SecurityContext crear(String email, String rol) {
    SecurityContext contexto = SecurityContextHolder.createEmptyContext();
    contexto.setAuthentication(new UsernamePasswordAuthenticationToken(
            email,
            null,
            List.of(new SimpleGrantedAuthority(PREFIJO_ROL + rol))));
    return contexto;
}
```

#### Comprobación de propiedad del recurso además del rol — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/PedidoService.java:214`

```java
return pedidoDAO.findByIdAndClienteId(pedidoId, cliente.getId())
```

`backend/src/main/java/es/uclm/esibuy/backend/services/PagoSimuladoService.java:130-133`

```java
long eliminados = metodoPagoDAO.deleteByIdAndClienteId(idMetodo, cliente.getId());
if (eliminados == 0) {
	throw new MetodoPagoNoEncontradoException();
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/EliminacionProducto.java:28-30`

```java
if (!vendedor.getNombreComercial().equals(producto.getVendedor())) {
    throw new ProductoAjenoException();
}
```

### 3.5 Seguridad específica de MongoDB

#### Autenticación SCRAM-SHA-256 — **Verificación manual**

La URI llega por variable de entorno; no se fuerza `authMechanism` (buscado `authMechanism`, `SCRAM` → sin resultados).

`backend/src/main/resources/application.properties:5`

```properties
spring.mongodb.uri=${MONGODB_URI}
```

#### Usuarios separados por tarea; sin cuentas compartidas — **No**

Una sola cadena de conexión para la aplicación, las migraciones (`DatosPersonalesMigration`, `TotpKeyMigration`) y la creación de índices. Buscado `createUser`, `readWrite`, `dbOwner`, segundas URI de Mongo → solo un comentario en un test de integración.

`backend/src/main/resources/application.properties:5-7`

```properties
spring.mongodb.uri=${MONGODB_URI}
spring.mongodb.database=esibuy
spring.mongodb.auto-index-creation=true
```

#### Cifrado en tránsito cliente ⇄ Mongo (TLS 1.2+) — **Verificación manual**

Depende de la URI (un `mongodb+srv://` de Atlas implica TLS); no se fuerza `tls=true` en la configuración (buscado `tls=`, `ssl=` → sin resultados).

#### Prohibido $where y operadores peligrosos; sin claves de usuario con $ o . — **Sí**

Buscado `$where`, `mapReduce`, `$function`, `$accumulator`, `BasicQuery` → sin resultados. Las `@Query` usan parámetros posicionales, el texto de búsqueda se escapa y los cuerpos de petición son records tipados (buscado `Map<String, Object>`, `JsonNode`, `@RequestBody Map` en controladores → sin resultados).

`backend/src/main/java/es/uclm/esibuy/backend/dao/UsuarioConsultaDAOImpl.java:50-54`

```java
String textoSeguro = Pattern.quote(texto.trim());
criterios.add(new Criteria().orOperator(
		Criteria.where("nombre").regex(textoSeguro, "i"),
		Criteria.where("apellidos").regex(textoSeguro, "i"),
		Criteria.where("email").regex(textoSeguro, "i")));
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/PedidoDAO.java:31`

```java
@Query("{ '_id': ?0, 'clienteId': ?1, 'estado': ?2 }")
```

### 3.6 Subida y entrega de contenidos multimedia

#### Límite de tamaño en servidor y proxy — **Parcial**

Servidor: sí. Proxy: no hay configuración en el repositorio (verificación manual en Render).

`backend/src/main/resources/application.properties:39-40`

```properties
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=6MB
```

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:92-94`

```java
if (imagen.getSize() > TAMANO_MAXIMO) {
    throw new IllegalArgumentException(MENSAJE_IMAGEN_NO_VALIDA);
}
```

#### Validación de tipo por firma (magic numbers) + extensión con lista blanca — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:143-154`

```java
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
```

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:23-26`

```java
private enum TipoImagen {
    PNG("image/png", ".png", "png"),
    JPG("image/jpeg", ".jpg", "jpg", "jpeg"),
    GIF("image/gif", ".gif", "gif");
```

#### Rechazo de tipos ambiguos — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:103-110`

```java
TipoImagen tipo = detectarTipoReal(contenido);
// El tipo real, el Content-Type y la extensión del nombre deben coincidir; si no, el archivo es ambiguo.
if (tipo == null
        || !tipo.contentType.equals(imagen.getContentType())
        || !tieneExtensionSegura(imagen.getOriginalFilename(), tipo)
        || !terminaCorrectamente(contenido, tipo)) {
    throw new IllegalArgumentException(MENSAJE_IMAGEN_NO_VALIDA);
}
```

#### Transcodificación en sandbox — **No**

La imagen se guarda tal cual. Buscado `ImageIO.read`, `Thumbnail`, `ffmpeg`, `exif`, `Graphics2D` → la única coincidencia de `ImageIO` es la generación del QR en `TotpService.java:94`.

#### Escaneo antivirus (opcional) — **Parcial**

Integración con VirusTotal implementada, pero desactivada por defecto.

`backend/src/main/resources/application.properties:47-48`

```properties
virustotal.enabled=${VIRUSTOTAL_ENABLED:false}
virustotal.fail-closed=${VIRUSTOTAL_FAIL_CLOSED:true}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:113-115`

```java
if (virusTotalService != null) {
    virusTotalService.verificar(contenido, tipo.contentType);
}
```

#### Cabeceras seguras en descargas (opcional) — **Parcial**

`nosniff` y tipo correcto; sin `Content-Disposition` ni CSP.

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ProductoImagenMongoController.java:32-35`

```java
.contentType(MediaType.parseMediaType(
        imagen.getContentType()))
.header("X-Content-Type-Options", "nosniff")
.cacheControl(CacheControl.noCache())
```

#### URLs firmadas con caducidad controlada (opcional) — **No**

Las imágenes son públicas, con nombre UUID. Buscado `signed`, `firma`, `expires` en el servicio y el controlador de imágenes → nada relacionado con URLs firmadas (la única coincidencia de `firma` es un comentario sobre los magic bytes).

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:144-147`

```java
.requestMatchers(
                HttpMethod.GET,
                "/product-images/**")
.permitAll()
```

### 3.7 Cumplimiento y privacidad

#### Gestión de secretos y claves (fuera del código / repositorio) — **Sí**

Búsqueda de secretos en los ficheros versionados (patrones `api_key|secret|password|token|pepper` con valor literal y URIs `mongodb://`) → sin resultados fuera de los tests.

`.gitignore:2-5`

```
.env
/.certs/
*.p12
*.pfx
```

`backend/src/main/resources/application.properties:3`

```properties
spring.config.import=optional:file:../.env[.properties],optional:file:.env[.properties]
```

`azure-pipelines.yml:168-169`

```yaml
docker run --rm -v "$(Build.SourcesDirectory):/repo" \
  ghcr.io/gitleaks/gitleaks:v8.24.3 detect --source /repo --no-git --redact --verbose
```

Ver hallazgo H-06 sobre las credenciales de MongoDB.

#### Registros de auditoría securizados — **Parcial**

Existen eventos de seguridad sin datos personales, pero solo algunos (no se registran el login correcto, los cambios de 2FA, los bloqueos hechos por el administrador ni las modificaciones de usuarios) y solo van a la salida estándar: sin persistencia, integridad ni control de acceso.

`backend/src/main/java/es/uclm/esibuy/backend/services/AuditoriaService.java:23-29`

```java
public void registrarAltaAdministrador() {
    LOGGER.info("evento_seguridad=alta_administrador resultado=exito");
}

public void registrarEliminacionUsuarioPorAdministrador(String tipoUsuario) {
    LOGGER.info("evento_seguridad=usuario_eliminado_por_administrador tipo_usuario={} resultado=exito",
            tipoUsuario);
```

#### AGR según ISO/IEC 27001:2022 con MARISMA — **No**

Ver RQ-12.

#### Cumplimiento RGPD — **Parcial**

Hay derecho de supresión (baja de cuenta con borrado en transacción), minimización, cifrado y enmascarado. Buscado `rgpd`, `gdpr`, `privacidad`, `consentimiento`, `cookies`, `protección de datos` en `frontend/src` y `backend/src/main` → sin política de privacidad, consentimiento en el registro, exportación de datos ni política de retención.

`backend/src/main/java/es/uclm/esibuy/backend/services/BajaUsuarioService.java:67-80`

```java
public void darDeBajaCliente(String emailAutenticado) {
    String email = normalizarEmail(emailAutenticado);
    transaccion.executeWithoutResult(status -> {
        Cliente cliente = clienteDAO.findByEmail(email).orElseThrow(CuentaNoEncontradaException::new);
        for (Pedido pedido : pedidoDAO.findByClienteId(cliente.getId())) {
            pedidoDAO.save(pedido.desvinculadoCliente());
        }
        listaProductosDAO.deleteByUsuarioId(cliente.getId());
        metodoPagoDAO.deleteByClienteId(cliente.getId());
        carritoDAO.deleteById(cliente.getId());
        clienteDAO.delete(cliente);
    });
    sesionService.cerrarSesiones(email);
    auditoriaService.registrarBajaCuenta("CLIENTE");
```

#### Data masking y anonimización de logs — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/util/EnmascaradorDatosPersonales.java:8-15`

```java
public static String dniNif(String valor) {
    if (valor == null || valor.isBlank()) {
        return valor;
    }

    int caracteresVisibles = Math.min(2, valor.length());
    return valor.substring(0, caracteresVisibles)
            + "*".repeat(Math.max(0, valor.length() - caracteresVisibles));
```

`backend/src/main/java/es/uclm/esibuy/backend/dto/LoginRequest.java:9-12`

```java
@Override
public String toString() {
    return "LoginRequest[credentials=REDACTED]";
}
```

## 4. Hallazgos de seguridad detectados durante la revisión

Ninguno se considera bloqueante o crítico; la severidad es una estimación de esta auditoría.

| Id | Severidad | Hallazgo | Ubicación |
|---|---|---|---|
| H-01 | Media | Enumeración de usuarios por tiempo: si el correo no existe no se calcula bcrypt y la respuesta es más rápida | `backend/…/services/AuthService.java:50-51` |
| H-02 | Media | Un manejador global devuelve al cliente el mensaje de cualquier `IllegalArgumentException`, incluidas las de librerías | `backend/…/controllers/RegistrationExceptionHandler.java` (`handleInvalidQuery`) |
| H-03 | Media | Sin caducidad de contraseña ni cambio de contraseña en sesión | `backend/…/model/Usuario.java`, `PasswordPolicy.java` |
| H-04 | Media | Registro público sin rate limiting y excluido de CSRF (coste de bcrypt y alta masiva de cuentas pendientes) | `backend/…/config/SecurityConfiguration.java:96-100` |
| H-05 | Media | Logs sin estructura ni contexto y auditoría sin protección | `backend/…/services/AuditoriaService.java` |
| H-06 | Media (Alta si se confirma) | La documentación reconoce credenciales de MongoDB posiblemente expuestas y pendientes de rotar | `docs/CI-CD-Render.md:249` |
| H-07 | Media | Un único usuario de MongoDB para todo; SCRAM y TLS sin forzar ni evidenciar | `backend/src/main/resources/application.properties:5-7` |
| H-08 | Baja | `PUT /usuarios/perfil` reutiliza la modificación del administrador sin `@Valid`: el usuario puede cambiar su propio `dniNif`, `esPremium` o `categoriaId` | `backend/…/services/PerfilService.java` (`modificarPerfil`) |
| H-09 | Baja | Sin Content-Security-Policy | `backend/…/config/SecurityConfiguration.java` |
| H-10 | Baja | El pepper de contraseñas se reutiliza como clave HMAC para seudonimizar el estado de intentos | `backend/…/dao/LoginAttemptStore.java:259-267` |
| H-11 | Baja | Límite de solicitudes de recuperación en memoria; sesiones concurrentes ilimitadas | `LimiteSolicitudesRecuperacion.java`, `SecurityConfiguration.java` |
| H-12 | Baja | `imagenPerfil` no se valida en el registro (sí en la modificación) | `backend/…/services/ClienteService.java` (`registrar`) |
| H-13 | Baja | El servidor Sonar se usa por HTTP sin cifrar (el token viaja en claro) | `backend/sonar-project.properties:1` |
| H-14 | Informativa | Código no utilizado y constructores solo para tests (RQ-13); imágenes de prueba versionadas | `MetodoPagoController.java`, `backend/uploads/productos/` |

Evidencia de H-06:

`docs/CI-CD-Render.md:249`

```markdown
Se deben rotar las credenciales de MongoDB que hayan podido quedar expuestas durante las pruebas.
```

## 5. Comprobaciones manuales pendientes

| Requisito | Qué aportar |
|---|---|
| RQ-08 | Capturas de la aplicación funcionando (login y una operación) en Chrome, Firefox, Edge y Safari |
| RQ-09 / 3.4 | Captura del candado y del certificado del despliegue (emisor y validez) y resultado de un test TLS externo; confirmación de la URL de despliegue propia del equipo |
| RQ-11 | Captura del panel de SonarQube del proyecto propio con 0 bloqueantes y 0 críticos (bugs, vulnerabilidades y code smells) |
| RQ-12 | Documento del AGR e informes exportados de MARISMA |
| RQ-13 | Informe de cobertura del frontend (`npm test -- --watch=false --coverage` con Node ≥ 22.22.3) y captura de la cobertura en Sonar |
| RQ-14 | Capturas del Quality Gate y de SonarLint en el IDE en modo conectado |
| RQ-17 / 3.5 | Capturas de MongoDB Atlas: mecanismo de autenticación (SCRAM-SHA-256), usuarios y roles, lista de IP permitidas, TLS mínimo y cifrado en reposo; confirmación de que la URI usa `mongodb+srv://` o `tls=true` |
| RQ-19 | Capturas de Code Scanning (alertas de CodeQL y propuestas de Copilot Autofix), tabla de vulnerabilidades con la decisión del equipo e informe final |
| 3.6 | Límite de tamaño de petición del proxy de Render |
| H-06 | Confirmación de que las credenciales de MongoDB se han rotado |
