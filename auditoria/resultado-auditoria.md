# Auditoría de requisitos de seguridad – ESIBuy (segunda auditoría)

- **Práctica:** Seguridad de Sistemas Software · P1 – Sistema web de comercio electrónico
- **Versión auditada:** rama `Develop`, commit `caf0d5a`. Primera auditoría: commit `9a8f5a7` (`auditoria/primera_auditoria/`).
- **Fecha:** 26/11/2026
- **Alcance:** backend Spring Boot 4.1.2 / Java 21, frontend Angular 22, app móvil Ionic/Capacitor (`mobile/`, nueva), configuración (`application.properties`, `pom.xml`, `Dockerfile`, `azure-pipelines.yml`, `codeql.yml`, `sonar-project.properties`) y conexión a MongoDB.
- **Rutas:** relativas a `Proyecto_ISO_2627-main/`. Los fragmentos son literales (solo se quita la sangría común); los secretos se muestran enmascarados.
- **Estados:** **Sí** · **Parcial** · **No** (se indica qué se ha buscado) · **Verificación manual**.
- **Sonar:** por indicación del equipo, las comprobaciones manuales de Sonar/SonarLint (panel, Quality Gate, IDE) se dan por **cumplidas y revisadas por el equipo**. No se han verificado en esta auditoría.

**Comprobaciones ejecutadas en esta auditoría** (sin modificar el repositorio):

| Comprobación | Resultado |
|---|---|
| Backend `./mvnw -B clean verify` (sin `BackendApplicationTests`, en una copia del commit) | 1681 pruebas, 0 fallos, 15 omitidas; JaCoCo 91,4 % líneas, 92,1 % instrucciones, 79,1 % ramas |
| Frontend `npm test -- --watch=false --coverage` | 638 pruebas, 0 fallos; 80,7 % líneas, 80,1 % sentencias, 73,3 % ramas |
| `npm audit` (frontend y móvil) | 0 vulnerabilidades |
| Gitleaks 8.24.3 `--no-git` sobre una copia del commit | 2 hallazgos: token de Sonar en `backend/sonar-project.properties` y un ejemplo en `.claude/skills/…/owasp-proactive-controls.md` (probable falso positivo) |
| Prueba temporal de codificación de URL (MockMvc, cadena de seguridad real, en una copia) | 2 controles se pueden saltar (H-02 y H-03) |
| Pruebas de la app móvil | No ejecutadas (dependencias sin instalar) |
| Aplicación arrancada contra MongoDB, despliegue, Atlas, Render | No comprobados |

**Totales RQ-01 a RQ-19:** 11 Sí · 6 Parcial · 1 No · 1 Verificación manual (antes: 7 · 9 · 1 · 2).
**Totales criterios detallados (49):** 36 Sí · 9 Parcial · 2 No · 2 Verificación manual (antes: 26 · 16 · 5 · 2).

## 1. Tabla resumen

| RQ | Requisito | Antes | Ahora | Evidencia principal (ruta) |
|---|---|---|---|---|
| RQ-01 | Identificación con usuario y contraseña mediante RBAC | Sí | **Sí** | `backend/…/config/SecurityConfiguration.java`, `…/services/AuthService.java` |
| RQ-02 | Registro, listas, valoraciones, perfil y suscripción | Sí | **Sí** (web) | `…/controllers/ClienteController.java`, `ListasProductosController.java`, `PerfilController.java` |
| RQ-03 | Gestión de contenidos, estadísticas y valoraciones | Parcial | **Sí** | `…/controllers/EstadisticasVendedorController.java`, `EstadisticasAdministradorController.java` |
| RQ-04 | Gestión de usuarios solo para administrador | Parcial | **Parcial** | `…/controllers/AdministradorController.java` |
| RQ-05 | Política de contraseñas segura | Parcial | **Sí** | `…/services/PasswordPolicy.java`, `AuthService.java`, `CambioContrasenaService.java` |
| RQ-06 | Registro seguro y recuperación de contraseñas | Parcial | **Parcial** | `…/security/LimiteRegistroFilter.java`, `…/services/VerificacionCorreoService.java` |
| RQ-07 | Control y seguridad de sesión | Sí | **Sí** | `application.properties`, `…/services/SesionService.java` |
| RQ-08 | Accesible desde cualquier navegador | Verificación manual | **Verificación manual** | `frontend/src/index.html` |
| RQ-09 | Conexión segura HTTPS | Sí | **Parcial** ⬇ | `application.properties`, `mobile/capacitor.config.ts` |
| RQ-10 | Protección de información sensible en BBDD | Sí | **Sí** | `…/security/PepperedBCryptPasswordEncoder.java`, `…/services/DatosPersonalesCryptoService.java` |
| RQ-11 | 0 defectos/vulnerabilidades bloqueantes y críticos | Verificación manual | **Sí** (Sonar, declarado) | `azure-pipelines.yml`, `backend/sonar-project.properties` |
| RQ-12 | AGR ISO 27001:2022 | No | **No** | — |
| RQ-13 | Cobertura > 60 % y sin código muerto | Parcial | **Sí** | `backend/pom.xml`, `frontend/angular.json` |
| RQ-14 | Uso de Sonar y SonarLint | Parcial | **Sí** (declarado) | `backend/sonar-project.properties`, `frontend/sonar-project.properties`, `.vscode/settings.json` |
| RQ-15 | Principios CCN-CERT BP/28 y buenas prácticas | Parcial | **Parcial** | `documents/Correspondencia_BP28.md` |
| RQ-16 | 2FA y 3FA | Sí | **Sí** | `…/services/TotpService.java`, `EmailOtpService.java` |
| RQ-17 | Medidas de seguridad a nivel de BBDD | Parcial | **Parcial** | `application.properties`, `…/dao/AlmacenAuditoria.java` |
| RQ-18 | Recuperación segura de contraseña | Sí | **Sí** | `…/services/RecuperacionContrasenaService.java` |
| RQ-19 | Análisis de código asistido por IA | Parcial | **Parcial** | `.github/workflows/codeql.yml` |

## 2. Qué ha mejorado y qué ha empeorado

### Mejorado

| Área | Antes | Ahora |
|---|---|---|
| Contraseñas | Sin caducidad ni cambio en sesión; recuperación sin comprobar datos personales | Caducidad de 30 días, cambio autenticado, datos personales comprobados |
| Login | Respuesta más rápida si el correo no existía; sin avisos | bcrypt señuelo; aviso al titular al bloquearse la cuenta |
| Registro | Sin límite, sin CSRF, sin verificar correo, sin longitudes | Límite por IP, CSRF, verificación de correo, validación y consentimiento |
| Endurecimiento | Sin CSP; logs planos; mensajes internos al cliente | CSP y cabeceras; logs JSON con correlationId; errores genéricos; límite de 60 peticiones/min |
| Auditoría y permisos | Solo líneas de log; solo roles | Colección `auditoria` con consulta para ADMIN; permisos finos |
| Imágenes | Se guardaban tal cual | Recodificación sin metadatos, cabeceras de entrega y URLs firmadas |
| Privacidad | Sin política ni exportación | Política y aviso legal, consentimiento, descarga de datos |
| Funcionalidad y pruebas | Sin estadísticas; 1197 pruebas, 89,9 %; frontend sin medir | Estadísticas de vendedor y administrador; 1681 pruebas, 91,4 %; frontend 80,7 % |

Hallazgos de la primera auditoría **resueltos**: H-01 (tiempos del login), H-02 (mensajes internos), H-03 (caducidad), H-05 (logs), H-09 (CSP), H-12 (`imagenPerfil`) y H-04 (registro; con la salvedad del H-02 de este informe).

Hallazgos de la primera auditoría **que siguen**: H-06 (credenciales de MongoDB), H-07 (usuario único), H-08 (perfil, ahora más grave), H-10 (*pepper* reutilizado), H-11 (límites en memoria), H-13 (Sonar por HTTP) y H-14 (código sin uso, en parte).

### Empeorado o nuevo

| Cambio | Detalle |
|---|---|
| Token de Sonar en el repositorio | No existía en `9a8f5a7`. El criterio «secretos fuera del repositorio» baja de Sí a Parcial (H-04) |
| App móvil nueva | Envía credenciales por HTTP (H-05) y su registro ya no funciona (H-06). RQ-09 baja de Sí a Parcial |
| Pago premium | El pago nuevo se puede saltar desde el perfil (H-01) |
| Controles nuevos eludibles | Límite de registro y URLs firmadas (H-02, H-03) |
| Pantallas de estadísticas | Dan error al recargar (H-07) |

## 3. Requisitos generales

### RQ-01 – Identificación con usuario y contraseña mediante patrón RBAC

**Estado:** Sí

**Cómo se implementa:** `POST /usuarios/login` delega en `AuthService.autenticar`. El rol se deriva del tipo de usuario y la sesión guarda `ROLE_x` y sus permisos finos. `SecurityConfiguration` restringe por rol y permiso y termina en `anyRequest().authenticated()`.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/services/AuthService.java:91-104`

```java
Usuario usuario = usuarioDAO.findByEmail(correoNormalizado)
        .orElse(null);

boolean credencialesValidas;
if (usuario == null || usuario.getContrasenaHash() == null) {
    // Se ejecuta bcrypt igualmente para que el tiempo de respuesta no revele si la cuenta existe.
    passwordEncoder.matches(contrasena, hashSenuelo());
    credencialesValidas = false;
} else {
    credencialesValidas = passwordEncoder.matches(contrasena, usuario.getContrasenaHash());
}

if (!credencialesValidas) {
    rechazarCredencialesInvalidas(usuario, correoNormalizado);
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:394-399`

```java
// Cualquier otra ruta de administración (y futuras) exige al menos el rol.
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

**Estado:** Sí (en la aplicación web)

**Cómo se implementa:** Hay altas de cliente y vendedor, listas y favoritos, valoraciones sobre pedidos, perfil y cambio de suscripción con pago simulado. Se añaden alertas y categorías favoritas, siempre sobre el cliente de la sesión.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ClienteController.java:59-63`

```java
@PostMapping("/register")
public ResponseEntity<RegistroPublicoResponse> register(@Valid @RequestBody RegistroClienteRequest request) {
        clienteService.registrar(request);
        return ResponseEntity.accepted().body(RegistroPublicoResponse.confirmacion());
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

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PerfilController.java:64-73`

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

`backend/src/main/java/es/uclm/esibuy/backend/services/ClienteService.java:156-162`

```java
// PBI 290: hacerse premium requiere pagar con un método de pago del cliente (pago simulado).
// Volver a estándar, o pedir premium siendo ya premium, no requiere pago.
if (esPremium && !cliente.isEsPremium()) {
        comprobarPagoPremium(cliente, metodoPagoId);
}

cliente.setEsPremium(esPremium);
```

**Observaciones:** el pago premium se puede saltar (H-01). El registro desde la app móvil falla (H-06).

### RQ-03 – Gestión de contenidos, estadísticas y valoraciones

**Estado:** Sí

**Cómo se implementa:** El vendedor gestiona sus productos y consulta ventas y valoraciones de su tienda. El administrador consulta productos, ventas, valoraciones y ranking de vendedores. Las valoraciones se muestran agregadas (medias y rankings), sin los comentarios.

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

`backend/src/main/java/es/uclm/esibuy/backend/controllers/EstadisticasVendedorController.java:16-29`

```java
@RequestMapping("/vendedor/estadisticas")
@PreAuthorize("hasRole('VENDEDOR')")
public class EstadisticasVendedorController {

    private final EstadisticasVendedorService estadisticasVendedorService;

    public EstadisticasVendedorController(EstadisticasVendedorService estadisticasVendedorService) {
        this.estadisticasVendedorService = estadisticasVendedorService;
    }

    // PBI 276: productos más y menos vendidos
    @GetMapping("/ventas")
    public EstadisticasVentasResponse consultarVentas(Authentication authentication) {
        return estadisticasVendedorService.consultarVentas(authentication.getName());
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/EstadisticasAdministradorController.java:25-40`

```java
// PBI 279: productos más y menos vendidos de todas las tiendas
@GetMapping("/ventas")
public EstadisticasVentasResponse consultarVentas() {
    return estadisticasAdministradorService.consultarVentas();
}

// PBI 280: productos mejor y peor valorados de todas las tiendas
@GetMapping("/valoraciones")
public EstadisticasValoracionesResponse consultarValoraciones() {
    return estadisticasAdministradorService.consultarValoraciones();
}

// PBI 281: ranking de vendedores por la valoración media de sus productos
@GetMapping("/vendedores")
public EstadisticasVendedoresResponse consultarVendedores() {
    return estadisticasAdministradorService.consultarVendedores();
```

**Observaciones:** `/admin/estadisticas` y `/vendedor/estadisticas` faltan en el servidor (H-07).

### RQ-04 – Módulo de gestión de usuarios solo para administrador

**Estado:** Parcial

**Cómo se implementa:** Alta de administradores, consulta, modificación, activación, bloqueo y desbloqueo, bajo rol ADMIN y permiso concreto. El borrado solo actúa sobre administradores.

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

`backend/src/main/java/es/uclm/esibuy/backend/services/AdministradorService.java:399-424`

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

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AdministradorController.java:95-98`

```java
@PutMapping("/usuarios/{id}")
public ResponseEntity<UsuarioAdministracionResponse> modificarUsuario(
        @PathVariable String id,
        @RequestBody ModificarUsuarioRequest request) {
```

**Qué falta / mejoras:**
- **Eliminar clientes y vendedores desde el módulo:** buscado `@DeleteMapping` en `AdministradorController` → una sola coincidencia, que usa `administradorDAO.findById`.
- La modificación no usa `@Valid` ni limita la longitud de nombre y apellidos.

### RQ-05 – Política de contraseñas segura

**Estado:** Sí

**Cómo se implementa:** Mínimo 8 caracteres con cuatro clases, diccionario local, exclusión de datos personales, historial de 5 y caducidad configurable (30 días). Hay cambio autenticado y recuperación por correo.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:49-69`

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

`backend/src/main/java/es/uclm/esibuy/backend/model/Usuario.java:144-156`

```java
public void registrarContrasenaHash(String contrasenaHash) {
    this.contrasenaHash = contrasenaHash;
    this.contrasenaCambiadaEn = Instant.now();
    if (historialContrasenasHash == null) {
        historialContrasenasHash = new ArrayList<>();
    }
    historialContrasenasHash.add(0, contrasenaHash);
    if (historialContrasenasHash.size() > 5) {
        historialContrasenasHash = new ArrayList<>(historialContrasenasHash.subList(0, 5));
    }
}

public void actualizarContrasenaHash(String nuevoHash) {
```

`backend/src/main/java/es/uclm/esibuy/backend/services/AuthService.java:153-164`

```java
private void comprobarCaducidadContrasena(Usuario usuario, String correoNormalizado) {
    if (usuario.getContrasenaCambiadaEn() == null) {
        usuario.setContrasenaCambiadaEn(clock.instant());
        usuarioDAO.save(usuario);
        return;
    }
    if (!clock.instant().isBefore(usuario.getContrasenaCambiadaEn().plus(vidaMaximaContrasena))) {
        // Las credenciales eran correctas: no cuenta como intento fallido.
        loginAttemptService.registrarExito(correoNormalizado);
        auditoriaService.registrarEvento("login_rechazado", "fallo", usuario.getId(),
                Map.of("motivo", "contrasena_caducada"));
        throw new ContrasenaCaducadaException();
```

`backend/src/main/java/es/uclm/esibuy/backend/services/CambioContrasenaService.java:67-81`

```java
passwordPolicy.validate(nuevaContrasena, PasswordPolicy.datosPersonalesDe(usuario));

List<String> hashesRecientes = new ArrayList<>(usuario.getHistorialContrasenasHash());
String hashActual = usuario.getContrasenaHash();
if (!hashesRecientes.contains(hashActual)) {
    hashesRecientes.add(hashActual);
}
if (passwordPolicy.matchesRecentPassword(nuevaContrasena, hashesRecientes, passwordEncoder)) {
    throw new InvalidRegistrationException(
            "nuevaContrasena",
            "No puedes reutilizar una de tus contraseñas recientes.");
}

usuario.registrarContrasenaHash(passwordEncoder.encode(nuevaContrasena));
usuarioDAO.save(usuario);
```

**Observaciones:** en las cuentas anteriores a la medida, los 30 días empiezan en su primer login.

### RQ-06 – Registro de usuario seguro y recuperación de contraseñas

**Estado:** Parcial

**Cómo se implementa:** El registro público exige CSRF, aceptación de la política y validación con longitudes y formatos; responde igual exista o no el correo; limita las altas por IP y envía un enlace de verificación (solo se guarda su SHA-256, 24 h, un solo uso).

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/security/LimiteRegistroFilter.java:32`

```java
static final Set<String> RUTAS = Set.of("/cliente/register", "/vendedor/register");
```

`backend/src/main/java/es/uclm/esibuy/backend/security/LimiteRegistroFilter.java:50-52`

```java
protected boolean shouldNotFilter(HttpServletRequest request) {
    return !HttpMethod.POST.matches(request.getMethod()) || !RUTAS.contains(request.getRequestURI());
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/VerificacionCorreoService.java:69-79`

```java
public void iniciar(Usuario usuario) {
    try {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tokenDAO.save(new TokenVerificacionCorreo(
                calcularHash(token), usuario.getId(), reloj.instant().plus(VALIDEZ_TOKEN)));

        String enlace = urlFrontend + "/verificar-correo?token=" + token;
        brevoEmailService.enviarVerificacionCorreoEnSegundoPlano(usuario.getEmail(), enlace);
```

`backend/src/main/java/es/uclm/esibuy/backend/dto/RegistroClienteRequest.java:16-25`

```java
@NotBlank @Size(max = PatronesEntrada.MAX_NOMBRE) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String nombre,
@NotBlank @Size(max = PatronesEntrada.MAX_APELLIDOS) @Pattern(regexp = PatronesEntrada.SIN_CARACTERES_DE_CONTROL, message = PatronesEntrada.MENSAJE_SIN_CARACTERES_DE_CONTROL) String apellidos,
@NotNull @Adult LocalDate fechaNacimiento,
@NotBlank @Size(min = 9, max = 9, message = "El DNI/NIF debe tener 9 caracteres.") @Pattern(regexp = "^[0-9]{8}[A-Za-z]$", message = "El DNI/NIF debe tener 8 números y una letra.") String dniNif,
@NotBlank @Email @Size(max = PatronesEntrada.MAX_EMAIL) String email,
@NotBlank @Size(max = PatronesEntrada.MAX_CONTRASENA) String contrasena,
@Pattern(regexp = PatronesEntrada.TELEFONO, message = PatronesEntrada.MENSAJE_TELEFONO) @Size(max = 20) String telefono,
@ImagenPerfilHttps String imagenPerfil,
boolean esPremium,
@NotNull(message = "Debes aceptar la política de privacidad.") @AssertTrue(message = "Debes aceptar la política de privacidad.") Boolean aceptaPolitica) {
```

**Qué falta / mejoras:**
- El límite de altas se salta codificando un carácter de la ruta (H-02).
- El registro de la app móvil no envía CSRF ni consentimiento (H-06).
- No hay reenvío del enlace de verificación.

### RQ-07 – Control y seguridad de sesión

**Estado:** Sí

**Cómo se implementa:** Cookie `HttpOnly`, `Secure`, `SameSite=Lax`; 30 min de inactividad y 8 h absolutas; rotación del identificador al autenticar y al cambiar contraseña o factores; cierre de las demás sesiones.

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

`backend/src/main/java/es/uclm/esibuy/backend/security/SesionAbsolutaFilter.java:55-58`

```java
if (!Instant.now().isBefore(autenticadaEn.plus(timeoutAbsoluto))) {
    expirarSesion(sesion, response);
    return;
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/SesionService.java:24-30`

```java
public void cerrarSesiones(String email) {
    if (email == null || email.isBlank()) {
        return;
    }
    sessionRegistry.getAllSessions(normalizar(email), false)
            .forEach(SessionInformation::expireNow);
}
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthController.java:374-382`

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
```

`backend/src/main/java/es/uclm/esibuy/backend/services/SesionService.java:34-41`

```java
public void rotarSesion(HttpServletRequest request, String email) {
    if (request.getSession(false) == null) {
        cerrarSesiones(email);
        return;
    }
    String idNuevo = request.changeSessionId();
    registrarSesion(idNuevo, email);
    cerrarOtrasSesiones(email, idNuevo);
```

**Observaciones:** sesiones concurrentes sin límite y registro de sesiones en memoria (H-10).

### RQ-08 – Accesible desde cualquier navegador

**Estado:** Verificación manual

**Cómo se implementa:** Aplicación Angular estándar. La compatibilidad real no se puede demostrar desde el código.

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

**Qué falta:** capturas en Chrome, Firefox, Edge y Safari, comprobando además que la nueva CSP no rompe nada.

### RQ-09 – Conexión segura HTTPS

**Estado:** Parcial (antes Sí)

**Cómo se implementa:** El backend usa TLS 1.2/1.3 en local y delega TLS en Render. La web se sirve por HTTPS. La app móvil, en cambio, llama al backend por HTTP y permite tráfico en claro y contenido mixto.

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

`frontend/angular.json:73-75`

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

`mobile/src/environments/environment.ts:5-7`

```typescript
export const environment = {
  apiUrl: 'http://10.0.2.2:8443'
};
```

`mobile/capacitor.config.ts:7-14`

```typescript
server: { cleartext: true },
android: {
  /*
   * La app se sirve como https://localhost y el backend de desarrollo va por http://:
   * sin esto Android bloquearía las imágenes de los productos (contenido mixto).
   * Con un backend HTTPS no haría falta.
   */
  allowMixedContent: true
```

`mobile/android/app/src/main/AndroidManifest.xml:3-9`

```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:usesCleartextTraffic="true"
```

**Qué falta / mejoras:** entorno móvil HTTPS sin `cleartext`, `usesCleartextTraffic` ni `allowMixedContent`; evidencia del certificado del despliegue.

### RQ-10 – Protección de información sensible en BBDD

**Estado:** Sí

**Cómo se implementa:** Contraseñas con bcrypt coste 12 y *pepper*; secreto TOTP, DNI y teléfono con AES-256-GCM; referencias de pago enmascaradas; tokens guardados como hash.

**Evidencia:**

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:70-74`

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

**Observaciones:** nombre, correo, fecha de nacimiento y direcciones siguen en claro; los datos antiguos solo se cifran si se ejecuta la migración.

### RQ-11 – 0 defectos/bugs/vulnerabilidades bloqueantes y críticos

**Estado:** Sí (según la comprobación de Sonar declarada por el equipo)

**Cómo se implementa:** SonarQube, Dependency-Check y `npm audit` en el pipeline. El panel lo ha revisado el equipo; en esta auditoría solo se ha ejecutado `npm audit` (0).

**Evidencia:**

`backend/pom.xml:186`

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

**Observaciones:** la captura del panel debe ir en la memoria. Los fallos H-01 a H-03 son de lógica y no consta que Sonar los señale. El *Secret Scan* del pipeline usa el mismo comando con el que aquí aparecen 2 hallazgos: es previsible que falle, y la etapa de Sonar depende de que termine bien (comprobad la última ejecución).

### RQ-12 – Análisis y Gestión de Riesgos (ISO 27001:2022)

**Estado:** No

**Qué he buscado:** ficheros con `marisma`, `agr` o `riesgo` en el nombre (`git ls-files`) → sin resultados.

**Qué falta:** el AGR con MARISMA. Si existe fuera del repositorio, hay que aportarlo.

### RQ-13 – Cobertura de pruebas > 60 % y sin código muerto

**Estado:** Sí

**Cómo se implementa:** JaCoCo exige 60 % de líneas y Vitest umbrales del 60 %. Medido: backend 91,4 % y frontend 80,7 %. El código muerto se da por revisado con Sonar.

**Evidencia:**

`backend/pom.xml:154-173`

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

`frontend/angular.json:91-94`

```json
"coverageThresholds": {
  "statements": 60,
  "lines": 60
}
```

**Observaciones:** el método siguiente sigue sin mapeo HTTP (solo lo usan pruebas); conviene borrarlo. La cobertura de `mobile/` no se ha medido y el pipeline no la ejecuta.

`backend/src/main/java/es/uclm/esibuy/backend/controllers/MetodoPagoController.java:55-57`

```java
public List<MetodoPagoResponse> consultarMetodosPago(Authentication authentication) {
    return pagoSimuladoService.consultarMetodosPago(authentication.getName());
}
```

### RQ-14 – Uso de Sonar y SonarLint

**Estado:** Sí (uso comprobado por el equipo)

**Cómo se implementa:** Ahora hay `sonar-project.properties` en backend y frontend, el pipeline ejecuta `sonar-scanner` en ambos y `.vscode/settings.json` enlaza SonarLint en modo conectado.

**Evidencia:**

`backend/sonar-project.properties:1-4`

```properties
sonar.host.url=http://seralu4.esi.uclm.es:1521/

sonar.projectKey=2026-g01-backend
sonar.projectName=2026-g01-backend
```

`frontend/sonar-project.properties:1-4`

```properties
sonar.host.url=http://seralu4.esi.uclm.es:1521/

sonar.projectKey=2026-g01-frontend
sonar.projectName=2026-g01-frontend
```

`.vscode/settings.json:3-6`

```json
"sonarlint.connectedMode.project": {
    "connectionId": "http-seralu4-esi-uclm-es-1521-",
    "projectKey": "2026-g01-backend"
},
```

**Observaciones:** las claves son `2026-g01-*` (confirmad que es vuestro proyecto); el servidor va por HTTP; `mobile/` no se analiza.

### RQ-15 – Principios CCN-CERT BP/28 y buenas prácticas

**Estado:** Parcial

**Cómo se implementa:** Mínimo privilegio, denegación por defecto, fallo seguro si faltan claves, defensa en profundidad y un documento de correspondencia.

**Evidencia:**

`documents/Correspondencia_BP28.md:3`

```markdown
> **Aviso de alcance.** El equipo no dispone del documento oficial CCN-CERT BP/28. Esta tabla **no es una transcripción de su índice**: son los principios de seguridad en el desarrollo de aplicaciones que la auditoría (RQ-15) y el equipo han considerado alineados con el espíritu de esa guía, redactados con palabras propias y contrastados con el código actual. Cuando se consiga el documento oficial, hay que revisar que no falte ningún principio y ajustar los nombres (columna «Principio»). Mientras tanto, esta correspondencia justifica el RQ-15 como **trazabilidad interna**, no como equivalencia literal.
```

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

**Qué falta:** contrastar con el BP/28 oficial (el documento es una adaptación propia); resolver los criterios Parcial/No; actualizar la tabla del documento, que no recoge H-01 a H-06.

### RQ-16 – Segundo (2FA) y tercer factor (3FA) de autenticación

**Estado:** Sí

**Cómo se implementa:** TOTP con secreto cifrado y códigos de respaldo; código por correo de 10 minutos guardado como HMAC; obligatorios para ADMIN y VENDEDOR, opcionales para clientes con aviso de activación.

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

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:108-120`

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

**Cómo se implementa:** URI por variable de entorno, claves de intentos seudonimizadas, cifrado de campo y auditoría de solo inserción desde la aplicación.

**Evidencia:**

`backend/src/main/resources/application.properties:5-7`

```properties
spring.mongodb.uri=${MONGODB_URI}
spring.mongodb.database=esibuy
spring.mongodb.auto-index-creation=true
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:304-312`

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

`docs/CI-CD-Render.md:156-160`

```markdown
### Acceso a MongoDB Atlas

Para que Spring Boot pudiera conectarse desde Render, se añadieron a la lista de acceso de MongoDB Atlas los rangos de direcciones de salida indicados en el panel del servicio.

De esta forma, se permitió la conexión desde Render sin autorizar indiscriminadamente todas las direcciones de Internet.
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/AlmacenAuditoria.java:13-24`

```java
// Almacén de solo inserción y consulta: a propósito no ofrece actualizar ni borrar, y no extiende
// MongoRepository (que sí expone el borrado). La retención la aplica el índice TTL de la colección.
@Repository
public class AlmacenAuditoria {

    private final MongoTemplate mongoTemplate;

    public AlmacenAuditoria(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public void insertar(EventoAuditoria evento) {
```

**Qué falta:** usuarios de MongoDB separados y con roles mínimos; SCRAM y TLS evidenciados; copias de seguridad; la rotación de credenciales sigue anotada como pendiente (H-09).

### RQ-18 – Recuperación segura de contraseña

**Estado:** Sí

**Cómo se implementa:** Token de 32 bytes guardado como SHA-256, 30 minutos, un solo uso atómico, respuesta uniforme, política completa e historial, y cierre de sesiones.

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

`backend/src/main/java/es/uclm/esibuy/backend/services/RecuperacionContrasenaService.java:143-155`

```java
transaccion.executeWithoutResult(status -> {
    if (tokenDAO.consumirSiValido(tokenGuardado.getId(), ahora) != 1) {
        throw new TokenRecuperacionInvalidoException();
    }

    // Abrir el enlace que llega al correo demuestra que el titular lo controla.
    correoVerificadoAhora[0] = !usuario.isCorreoVerificado();
    usuario.setCorreoVerificado(true);
    usuario.registrarContrasenaHash(passwordEncoder.encode(nuevaContrasena));
    usuarioDAO.save(usuario);
});

sesionService.cerrarSesiones(usuario.getEmail());
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

### RQ-19 – Análisis de código asistido por IA

**Estado:** Parcial

**Cómo se implementa:** Existe un workflow de CodeQL y un informe de la primera auditoría (Semgrep). El equipo anota un Semgrep sin hallazgos en `requisitos-seguridad/PROGRESO.md` (no re-ejecutado aquí).

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

**Qué falta:**
- El workflow está en `Proyecto_ISO_2627-main/.github/workflows/`; en la raíz del repositorio no hay `.github/workflows`, así que **GitHub no lo ejecuta**. Además, al moverlo habrá que corregir el filtro de rama (`develop`, cuando la rama es `Develop`) y `working-directory: backend`.
- En `auditoria/primera_auditoria/informe-rq19.md` la decisión del equipo no consta; no hay informe sobre el código actual ni evidencia de Copilot Autofix.

## 4. Criterios detallados (aclaraciones)

### 3.1 Autenticación multifactor (3FA)

#### F1 – Contraseña: longitud ≥ 8, blacklist, caducidad (30 días) y no reutilizar las últimas 5 — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:50-54`

```java
if (password == null || password.codePointCount(0, password.length()) < 8
        || !contains(password, Character::isUpperCase)
        || !contains(password, Character::isLowerCase)
        || !contains(password, Character::isDigit)
        || !containsSpecial(password)) {
```

`backend/src/main/resources/application.properties:35`

```properties
app.security.password.max-age=30d
```

`backend/src/main/java/es/uclm/esibuy/backend/model/Usuario.java:150-153`

```java
historialContrasenasHash.add(0, contrasenaHash);
if (historialContrasenasHash.size() > 5) {
    historialContrasenasHash = new ArrayList<>(historialContrasenasHash.subList(0, 5));
}
```

#### F1 – Bloqueo progresivo por intentos fallidos + rate limiting — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:28`

```java
private static final int WINDOW_SECONDS = 300;
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:35-38`

```java
private static final int MAX_PAIR_ATTEMPTS = 5;
private static final int ADAPTIVE_USER_THRESHOLD = 20;
private static final int ADAPTIVE_DELAY_SECONDS = 2;
private static final int[] BACKOFF_SECONDS = { 30, 120, 240, 300 };
```

#### F2 – TOTP: secreto cifrado, QR de alta, tolerancia ±1 paso, códigos de respaldo — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:114-118`

```java
for (long offset = -1; offset <= 1; offset++) {
    if (constantTimeEquals(generarCodigo(secret, currentStep + offset), normalizedCode)) {
        return currentStep + offset;
    }
}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:194-196`

```java
var backupCodes = generarCodigosRespaldo();
var hashes = backupCodes.stream().map(passwordEncoder::encode).toList();
String encrypted = cryptoService.cifrar(secret);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:243-245`

```java
public void guardarSecretoPendiente(Usuario usuario, String secret) {
    String encrypted = cryptoService.cifrar(secret);
    Instant expires = Instant.now().plusSeconds(600);
```

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

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PerfilController.java:112-116`

```java
if (usuario instanceof Vendedor || usuario instanceof Administrador) {
    throw new ResponseStatusException(
            HttpStatus.FORBIDDEN,
            "El segundo factor es obligatorio para este rol.");
}
```

#### Política por rol: Usuario con 3FA opcional e incentivo a activar F2 — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/services/PerfilService.java:66-69`

```java
if (activado && !usuario.isTotpActivado()) {
    throw new ResponseStatusException(
            HttpStatus.CONFLICT, "Activa primero el segundo factor TOTP.");
}
```

`frontend/src/app/pages/perfil/perfil.html:148-151`

```html
<p>Protege tu cuenta con Google Authenticator, Authy u otra aplicación compatible.</p>
<button class="boton-principal" type="button" (click)="configurarTOTP()" [disabled]="cargandoTOTP()">
  Configurar segundo factor
</button>
```

Aviso nuevo para clientes sin TOTP:

`frontend/src/app/shared/aviso-segundo-factor/aviso-segundo-factor.html:1-12`

```html
@if (visible()) {
  <aside class="aviso-segundo-factor" role="status" aria-label="Recomendación de seguridad">
    <p class="aviso-texto">
      <strong>Protege tu cuenta.</strong>
      Activa el segundo factor de autenticación para que nadie pueda entrar solo con tu contraseña.
    </p>
    <div class="aviso-acciones">
      <a class="aviso-enlace" routerLink="/perfil" fragment="segundo-factor-titulo">Activar segundo factor</a>
      <button class="aviso-descartar" type="button" (click)="descartar()">Ahora no</button>
    </div>
  </aside>
}
```

### 3.2 Defensa contra diccionario y credential stuffing

#### Contraseña ≥ 8 caracteres (recomendado 12+) — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:50-54`

```java
if (password == null || password.codePointCount(0, password.length()) < 8
        || !contains(password, Character::isUpperCase)
        || !contains(password, Character::isLowerCase)
        || !contains(password, Character::isDigit)
        || !containsSpecial(password)) {
```

#### Bloqueo de contraseñas de listas comunes — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:63-69`

```java
if (commonPasswords.contains(normalizedPassword)
        || commonPasswords.contains(alphanumericPassword)
        || commonPasswords.contains(passwordWithoutTrailingDigits)) {
    throw new InvalidRegistrationException(
            CAMPO_CONTRASENA,
            "La contraseña no puede contener términos de la lista de contraseñas comunes.");
}
```

#### La contraseña no contiene datos personales — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:72-85`

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
passwordPolicy.validate(nuevaContrasena, PasswordPolicy.datosPersonalesDe(usuario));
```

#### Rate limiting base: máx. 5 intentos / 5 min por IP+usuario — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:80-84`

```java
String pairId = "par:" + fingerprint(ip + "\u0000" + email);
int pairWait = reservarVentana(pairId, now, WINDOW_SECONDS, MAX_PAIR_ATTEMPTS);
if (pairWait > 0) {
    return pairWait;
}
```

#### Backoff exponencial por cuenta: 30 s → 2 min → 4 min → 5 min — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:38`

```java
private static final int[] BACKOFF_SECONDS = { 30, 120, 240, 300 };
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:153-160`

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

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:87-94`

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

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:236-238`

```java
private int reservarCupoIpAdaptativo(String ipId, Instant now) {
    Query underLimit = Query.query(Criteria.where("_id").is(ipId)
            .and(CAMPO_ADAPTIVE_ATTEMPTS).lt(2));
```

#### Respuesta HTTP 429 con cabecera Retry-After — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuthExceptionHandler.java:27-32`

```java
@ExceptionHandler(LoginRateLimitException.class)
public ResponseEntity<ApiErrorResponse> manejarLimiteIntentos(LoginRateLimitException excepcion) {
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header("Retry-After", Integer.toString(excepcion.getRetryAfterSeconds()))
            .body(new ApiErrorResponse(excepcion.getMessage()));
}
```

#### Verificación de contraseñas filtradas en alta y cambio — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/PasswordPolicy.java:33`

```java
ClassPathResource resource = new ClassPathResource("security/common-passwords.txt");
```

`backend/src/main/java/es/uclm/esibuy/backend/services/SoporteRegistro.java:65`

```java
politicaContrasenas.validate(contrasena, datosNoNulos);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/CambioContrasenaService.java:67`

```java
passwordPolicy.validate(nuevaContrasena, PasswordPolicy.datosPersonalesDe(usuario));
```

#### Hash Argon2id o bcrypt (cost 12–14) con salt único — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:70-74`

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

#### Comparación en tiempo constante — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/services/AuthService.java:94-100`

```java
boolean credencialesValidas;
if (usuario == null || usuario.getContrasenaHash() == null) {
    // Se ejecuta bcrypt igualmente para que el tiempo de respuesta no revele si la cuenta existe.
    passwordEncoder.matches(contrasena, hashSenuelo());
    credencialesValidas = false;
} else {
    credencialesValidas = passwordEncoder.matches(contrasena, usuario.getContrasenaHash());
```

`backend/src/main/java/es/uclm/esibuy/backend/services/TotpService.java:288-291`

```java
private boolean constantTimeEquals(String expected, String actual) {
    return java.security.MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.US_ASCII), actual.getBytes(StandardCharsets.US_ASCII));
}
```

Queda la medición manual de tiempos que anota el propio equipo.

#### Alertas de intentos fallidos — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/services/AvisoBloqueoService.java:30-35`

```java
public void avisar(Usuario usuario, int retryAfterSeconds) {
    try {
        auditoriaService.registrarBloqueoCuenta(usuario.getEmail(), usuario.getId(), retryAfterSeconds);
        // Como máximo un correo por hora y cuenta, para no inundar al titular.
        if (loginAttemptService.permitirAvisoBloqueo(usuario.getEmail())) {
            brevoEmailService.enviarAvisoBloqueoEnSegundoPlano(usuario.getEmail());
```

Se avisa al titular (máximo un correo por hora); no a los administradores.

### 3.3 Gestión y control de sesión

#### Cookies con HttpOnly, Secure y SameSite — **Sí**

`backend/src/main/resources/application.properties:28-32`

```properties
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.same-site=lax

app.security.cookies.secure=${SESSION_COOKIE_SECURE:true}
server.servlet.session.cookie.secure=${SESSION_COOKIE_SECURE:true}
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:115-119`

```java
CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();

repository.setCookieCustomizer(cookie -> cookie.secure(cookieSeguro).sameSite("Lax"));

return repository;
```

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

#### Rotación del ID de sesión al cambiar credenciales / subir privilegios — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/controllers/CambioContrasenaController.java:45-47`

```java
// Al cambiar las credenciales se rota el identificador de la sesión actual y se cierran
// todas las demás del usuario.
sesionService.rotarSesion(request, email);
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PerfilController.java:98-99`

```java
TwoFactorConfirmationResponse respuesta = totpService.confirmarConfiguracion(usuario, request.code());
sesionService.rotarSesion(peticion, authentication.getName());
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

Falta la evidencia del certificado del despliegue y la app móvil usa HTTP (H-05).

#### Validación de entrada en servidor — **Parcial**

`backend/src/main/java/es/uclm/esibuy/backend/controllers/PerfilController.java:65-68`

```java
@PutMapping("/perfil")
public ResponseEntity<PerfilResponse> modificarPerfil(
        Authentication authentication,
        @RequestBody ModificarUsuarioRequest request) {
```

`backend/src/main/java/es/uclm/esibuy/backend/dto/ModificarUsuarioRequest.java:5-14`

```java
public record ModificarUsuarioRequest(
        String nombre,
        String apellidos,
        String telefono,
        String imagenPerfil,
        String dniNif,
        LocalDate fechaNacimiento,
        String sede,
        String categoriaId,
        Boolean esPremium) {
```

El registro y el login ya están completos; la modificación de perfil y de usuario sigue sin `@Valid` ni longitudes (H-01).

#### Codificación de salida según contexto (anti XSS) — **Sí**

`frontend/src/app/pages/perfil/perfil.html:153`

```html
<p>{{ mensajeTOTP() }}</p>
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:52-61`

```java
static final String POLITICA_CONTENIDO = "default-src 'self'; "
                + "script-src 'self'; "
                + "style-src 'self' 'unsafe-inline'; "
                + "font-src 'self' https://fonts.gstatic.com; "
                + "img-src 'self' data: https:; "
                + "connect-src 'self'; "
                + "object-src 'none'; "
                + "base-uri 'self'; "
                + "form-action 'self'; "
                + "frame-ancestors 'none'";
```

Buscado `innerHTML`, `bypassSecurityTrust`, `eval(` y `document.write` en `frontend/src/app` y `mobile/src/app` → sin resultados.

#### Rate limiting en peticiones (/login 5/5 min; /otp/send 3/h y 10/día; API 60 req/min) — **Sí** (antes Parcial)

`backend/src/main/resources/application.properties:39-45`

```properties
app.security.rate-limit.api.max-requests=60
app.security.rate-limit.api.window-seconds=60
# Altas públicas (/cliente/register y /vendedor/register) por IP, persistente en MongoDB.
app.security.rate-limit.registro.max-requests=5
app.security.rate-limit.registro.window-seconds=900
app.security.rate-limit.otp.per-hour=3
app.security.rate-limit.otp.per-day=10
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/LoginAttemptStore.java:107-116`

```java
public int reservarEnvioOtp(String email, Instant now) {
    ensureTtlIndex();
    String correo = email.trim().toLowerCase(java.util.Locale.ROOT);
    String diario = id("otp-email-dia", correo);
    int esperaDiaria = reservarVentana(diario, now, EMAIL_OTP_DAY_WINDOW_SECONDS, maxEmailOtpPerDay);
    if (esperaDiaria > 0) {
        return esperaDiaria;
    }
    int esperaHoraria = reservarVentana(
            id("otp-email", correo), now, EMAIL_OTP_HOUR_WINDOW_SECONDS, maxEmailOtpPerHour);
```

`backend/src/main/java/es/uclm/esibuy/backend/security/LimiteApiService.java:37-42`

```java
public synchronized Resultado registrar(String clave) {
    Instant ahora = reloj.instant();
    Instant limite = ahora.minus(ventana);
    limpiarSiCrece(limite);

    Deque<Instant> recientes = peticionesPorClave.computeIfAbsent(clave, c -> new ArrayDeque<>());
```

El límite general es en memoria y por instancia.

#### Errores genéricos al cliente, sin stack traces — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/controllers/RegistrationExceptionHandler.java:123-128`

```java
// Cualquier otra IllegalArgumentException (por ejemplo de una librería) no expone su mensaje.
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<ApiErrorResponse> handleInvalidQuery(IllegalArgumentException exception) {
    LOGGER.warn("Petición rechazada por un argumento no válido.", exception);
    return ResponseEntity.badRequest()
            .body(new ApiErrorResponse(MENSAJE_SOLICITUD_NO_VALIDA));
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/ManejadorErroresInesperados.java:65-68`

```java
static String cuerpo(String correlationId) {
    String id = correlationId == null ? "" : correlationId;
    return "{\"error\":\"" + MENSAJE_ERROR_INTERNO + "\",\"correlationId\":\"" + id + "\"}";
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

`backend/src/main/java/es/uclm/esibuy/backend/controllers/RegistrationExceptionHandler.java:110-114`

```java
@ExceptionHandler(ProductoAjenoException.class)
public ResponseEntity<ApiErrorResponse> handleForeignProduct(ProductoAjenoException exception) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ApiErrorResponse(exception.getMessage()));
}
```

#### Logs estructurados (JSON) con usuario, IP, endpoint, UA, correlationId y causa — **Sí** (antes No)

`backend/src/main/resources/application.properties:59-60`

```properties
logging.structured.format.console=${LOG_FORMAT:ecs}
logging.pattern.correlation=[%X{correlationId:-}]
```

`backend/src/main/java/es/uclm/esibuy/backend/security/ContextoLogFilter.java:46-51`

```java
MDC.put(MDC_CORRELATION_ID, correlationId);
MDC.put(MDC_USUARIO, usuarioSeudonimizado());
MDC.put(MDC_IP, saneado(request.getRemoteAddr()));
MDC.put(MDC_USER_AGENT, saneado(request.getHeader("User-Agent")));
MDC.put(MDC_METODO, saneado(request.getMethod()));
MDC.put(MDC_ENDPOINT, saneado(request.getRequestURI()));
```

Hay pruebas de configuración; no se ha comprobado la salida con la aplicación arrancada.

#### RBAC con mínimo privilegio y denegación por defecto — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:46`

```java
@EnableMethodSecurity
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:395-399`

```java
.requestMatchers(
                "/administrador/**")
.hasRole(ROL_ADMIN)

.anyRequest().authenticated();
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:399`

```java
.anyRequest().authenticated();
```

#### Roles (USER, CREATOR, ADMIN) y permisos finos (authorities) — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/security/CatalogoPermisos.java:30-44`

```java
private static final Map<String, List<String>> PERMISOS_POR_ROL = Map.of(
        "ADMIN", List.of(
                USUARIOS_CONSULTAR,
                USUARIOS_MODIFICAR,
                USUARIOS_BLOQUEAR,
                ADMINISTRADORES_GESTIONAR,
                PRODUCTOS_CONSULTAR,
                AUDITORIA_CONSULTAR,
                CATEGORIAS_GESTIONAR,
                CATEGORIAS_CONSULTAR),
        "VENDEDOR", List.of(
                PRODUCTOS_GESTIONAR,
                PEDIDOS_VENDEDOR_GESTIONAR,
                CATEGORIAS_CONSULTAR),
        "CLIENTE", List.of());
```

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:363-364`

```java
                "/administrador/auditoria")
.hasAllAuthorities(AUT_ADMIN, CatalogoPermisos.AUDITORIA_CONSULTAR)
```

#### Comprobación de propiedad del recurso además del rol — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/PedidoService.java:230`

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

`backend/src/main/java/es/uclm/esibuy/backend/services/AlertaService.java:65-66`

```java
Alerta alerta = alertaDAO.findByIdAndClienteId(alertaId, cliente.getId())
        .orElseThrow(AlertaNoEncontradaException::new);
```

### 3.5 Seguridad específica de MongoDB

#### Autenticación SCRAM-SHA-256 — **Verificación manual**

`backend/src/main/resources/application.properties:5`

```properties
spring.mongodb.uri=${MONGODB_URI}
```

Aportar captura de Atlas con el mecanismo y los usuarios.

#### Usuarios separados por tarea; sin cuentas compartidas — **No**

`backend/src/main/resources/application.properties:5-7`

```properties
spring.mongodb.uri=${MONGODB_URI}
spring.mongodb.database=esibuy
spring.mongodb.auto-index-creation=true
```

Buscado `createUser` o una segunda URI en código y configuración → sin resultados.

#### Cifrado en tránsito cliente ⇄ Mongo (TLS 1.2+) — **Verificación manual**

La URI es externa (`MONGODB_URI`). Aportar que usa `mongodb+srv://` o `tls=true` y el TLS mínimo de Atlas.

#### Prohibido $where y operadores peligrosos; sin claves de usuario con $ o . — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/dao/UsuarioConsultaDAOImpl.java:50-54`

```java
String textoSeguro = Pattern.quote(texto.trim());
criterios.add(new Criteria().orOperator(
        Criteria.where("nombre").regex(textoSeguro, "i"),
        Criteria.where("apellidos").regex(textoSeguro, "i"),
        Criteria.where("email").regex(textoSeguro, "i")));
```

`backend/src/main/java/es/uclm/esibuy/backend/dao/PedidoDAO.java:42`

```java
@Query("{ '_id': ?0, 'clienteId': ?1, 'estado': ?2 }")
```

Buscado `$where` y `BasicQuery` en `src/main/java` → sin resultados.

### 3.6 Subida y entrega de contenidos multimedia

#### Límite de tamaño en servidor y proxy — **Parcial**

`backend/src/main/resources/application.properties:66-67`

```properties
spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=6MB
```

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:124-126`

```java
if (imagen.getSize() > TAMANO_MAXIMO) {
    throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
}
```

Sin evidencia del límite del proxy de Render.

#### Validación de tipo por firma (magic numbers) + extensión con lista blanca — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:273-284`

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

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:55-58`

```java
private enum TipoImagen {
    PNG("image/png", ".png", "png"),
    JPG("image/jpeg", ".jpg", "jpg", "jpeg"),
    GIF("image/gif", ".gif", "gif");
```

#### Rechazo de tipos ambiguos — **Sí**

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:135-141`

```java
TipoImagen tipo = detectarTipoReal(contenido);
// El tipo real, el Content-Type y la extensión del nombre deben coincidir; si no, el archivo es ambiguo.
if (tipo == null
        || !tipo.contentType.equals(imagen.getContentType())
        || !tieneExtensionSegura(imagen.getOriginalFilename(), tipo)
        || !terminaCorrectamente(contenido, tipo)) {
    throw new DatosNoValidosException(MENSAJE_IMAGEN_NO_VALIDA);
```

#### Transcodificación en sandbox — **Parcial** (antes No)

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:177-180`

```java
private static byte[] recodificarConLimite(byte[] contenido, TipoImagen tipo) {
    Future<byte[]> tarea = RECODIFICADOR.submit(() -> recodificar(contenido, tipo));
    try {
        return tarea.get(TIEMPO_MAXIMO_SEGUNDOS, TimeUnit.SECONDS);
```

Recodifica con límites de dimensiones y tiempo, pero en el mismo proceso Java: no hay aislamiento.

#### Escaneo antivirus (opcional) — **Parcial**

`backend/src/main/resources/application.properties:74-75`

```properties
virustotal.enabled=${VIRUSTOTAL_ENABLED:false}
virustotal.fail-closed=${VIRUSTOTAL_FAIL_CLOSED:true}
```

`backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:148-150`

```java
if (virusTotalService != null) {
    virusTotalService.verificar(contenido, tipo.contentType);
}
```

Desactivado por defecto; sin evidencia de activación.

#### Cabeceras seguras en descargas (opcional) — **Sí** (antes Parcial)

`backend/src/main/java/es/uclm/esibuy/backend/security/CabecerasEntregaImagen.java:8-10`

```java
public static final String NOSNIFF = "nosniff";
public static final String POLITICA_CONTENIDO = "default-src 'none'; sandbox";
public static final String DISPOSICION = "inline; filename=\"imagen\"";
```

`backend/src/main/java/es/uclm/esibuy/backend/config/ProductoImagenConfiguration.java:41-43`

```java
response.setHeader("X-Content-Type-Options", CabecerasEntregaImagen.NOSNIFF);
response.setHeader("Content-Security-Policy", CabecerasEntregaImagen.POLITICA_CONTENIDO);
response.setHeader("Content-Disposition", CabecerasEntregaImagen.DISPOSICION);
```

#### URLs firmadas con caducidad controlada (opcional) — **Parcial** (antes No)

`backend/src/main/java/es/uclm/esibuy/backend/services/FirmaImagenService.java:90-104`

```java
public Resultado verificar(String nombre, String expiracion, String firma) {
    if (clave == null || nombre == null || nombre.isEmpty() || expiracion == null || firma == null) {
        return Resultado.INVALIDA;
    }
    long caducidad;
    try {
        caducidad = Long.parseLong(expiracion);
    } catch (NumberFormatException e) {
        return Resultado.INVALIDA;
    }
    byte[] esperada = calcular(nombre, caducidad).getBytes(StandardCharsets.US_ASCII);
    if (!MessageDigest.isEqual(esperada, firma.getBytes(StandardCharsets.US_ASCII))) {
        return Resultado.INVALIDA;
    }
    return reloj.instant().getEpochSecond() > caducidad ? Resultado.CADUCADA : Resultado.VALIDA;
```

`backend/src/main/java/es/uclm/esibuy/backend/security/FiltroImagenFirmada.java:26-29`

```java
protected boolean shouldNotFilter(HttpServletRequest request) {
    return !request.getRequestURI().startsWith(FirmaImagenService.RUTA_PUBLICA)
            || HttpMethod.OPTIONS.matches(request.getMethod());
}
```

La firma es correcta, pero el filtro se puede saltar (H-03).

### 3.7 Cumplimiento y privacidad

#### Gestión de secretos y claves (fuera del código / repositorio) — **Parcial** ⬇ (antes Sí)

`backend/sonar-project.properties:6`

```properties
sonar.token=squ_4fae…[ENMASCARADO]
```

El resto de secretos va por variables de entorno:

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

`requisitos-seguridad/PROGRESO.md` recoge que el token se mantiene «por orden del profesor». La decisión explica el hallazgo, pero el criterio sigue sin cumplirse; conviene tenerla por escrito.

#### Registros de auditoría securizados — **Parcial**

`backend/src/main/java/es/uclm/esibuy/backend/model/EventoAuditoria.java:18-19`

```java
// El índice TTL elimina los registros pasada la retención (app.auditoria.retencion).
@Indexed(name = "ttl_auditoria_fecha", expireAfter = "${app.auditoria.retencion:365d}")
```

`backend/src/main/java/es/uclm/esibuy/backend/controllers/AuditoriaController.java:31-32`

```java
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<ListadoAuditoriaResponse> consultar(
```

Sin firma ni encadenado, y el usuario de MongoDB de la aplicación puede borrar la colección.

#### AGR según ISO/IEC 27001:2022 con MARISMA — **No**

Buscado `marisma`, `agr` y `riesgo` en los nombres de fichero del repositorio → sin resultados.

#### Cumplimiento RGPD — **Parcial**

`backend/src/main/java/es/uclm/esibuy/backend/services/ExportacionDatosService.java:90-98`

```java
public ExportacionDatosResponse exportar(String emailAutenticado) {
    Usuario usuario = usuarioDAO.findByEmail(emailAutenticado)
            .orElseThrow(UsuarioNoEncontradoException::new);

    // Una exportación por minuto y usuario; si se supera, 429 con Retry-After.
    Instant ahora = reloj.instant();
    int espera = limites.reservar(TIPO_LIMITE, usuario.getId(), ahora, SEGUNDOS_ENTRE_EXPORTACIONES, 1);
    if (espera > 0) {
        throw new LoginRateLimitException(espera);
```

`frontend/src/app/pages/legal/politica-privacidad.html:13`

```html
<li>Responsable: [COMPLETAR: nombre o razón social]</li>
```

Las páginas legales publicadas tienen datos `[COMPLETAR]`, igual que los documentos de `documents/rgpd/`.

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

`backend/src/main/java/es/uclm/esibuy/backend/dto/LoginRequest.java:11-14`

```java
@Override
public String toString() {
    return "LoginRequest[credentials=REDACTED]";
}
```

`backend/src/main/java/es/uclm/esibuy/backend/security/Seudonimizador.java:26-34`

```java
public String seudonimizar(String valor) {
    if (valor == null || valor.isBlank()) {
        return "anonimo";
    }
    try {
        Mac mac = Mac.getInstance(ALGORITMO);
        mac.init(new SecretKeySpec(clave, ALGORITMO));
        String hash = HexFormat.of().formatHex(mac.doFinal(valor.getBytes(StandardCharsets.UTF_8)));
        return hash.substring(0, LONGITUD_IDENTIFICADOR);
```

## 5. Hallazgos de seguridad

Severidad estimada por esta auditoría. Ninguno se considera crítico.

| Id | Severidad | Hallazgo | Ubicación |
|---|---|---|---|
| H-01 | **Alta** | Un cliente se hace premium sin pagar con `PUT /usuarios/perfil` | `services/DatosRolUsuario.java`, `services/PerfilService.java` |
| H-02 | Media | El límite de altas por IP se salta codificando un carácter de la ruta | `security/LimiteRegistroFilter.java` |
| H-03 | Media | La comprobación de firma de las imágenes se salta igual | `security/FiltroImagenFirmada.java` |
| H-04 | Media (Alta si el repositorio es público) | Token de Sonar versionado y enviado a un servidor por HTTP | `backend/sonar-project.properties` |
| H-05 | Media (Alta si se distribuye la APK) | La app móvil envía credenciales y sesión por HTTP; además `allowBackup="true"` | `mobile/` |
| H-06 | Media (funcional) | El registro desde la app móvil se rechaza: sin token CSRF ni `aceptaPolitica` | `mobile/src/app/core/auth/registro.service.ts` |
| H-07 | Baja (funcional) | `/admin/estadisticas` y `/vendedor/estadisticas` fallan al recargar o entrar directo | `SecurityConfiguration.java`, `SpaController.java` |
| H-08 | Baja | CodeQL no se ejecuta (ver RQ-19) | `.github/workflows/codeql.yml` |
| H-09 | Media (sin confirmar) | La documentación sigue pidiendo rotar credenciales de MongoDB posiblemente expuestas | `docs/CI-CD-Render.md` |
| H-10 | Baja | Límites (API y recuperación) y registro de sesiones en memoria; sesiones concurrentes ilimitadas | `LimiteApiService.java`, `SecurityConfiguration.java` |
| H-11 | Baja | El *pepper* de contraseñas se reutiliza como clave HMAC (intentos y ahora también logs) | `LoginAttemptStore.java`, `Seudonimizador.java` |
| H-12 | Baja | Páginas legales publicadas sin completar | `frontend/src/app/pages/legal/` |
| H-13 | Informativa | Un método sin uso e imágenes de prueba versionadas | `MetodoPagoController.java`, `backend/uploads/` |
| H-14 | **Alta** (según versión de Java y CPU) | **Por corregir.** CVE-2026-114938 («Java4Shell») en el decodificador Base64 de la JVM, alcanzable sin autenticación por la cabecera CSRF | `Dockerfile`, JVM del despliegue |

### H-01 – Premium sin pago

El pago se exige en `PUT /cliente/tipo`, pero el perfil reutiliza la modificación del administrador, que aplica `esPremium` sin comprobar quién lo pide. La edición del propio DNI, en el mismo método, es una función que ofrecen la web y la app móvil y no forma parte del hallazgo. Comprobado por lectura del código; no se ha ejecutado.

`backend/src/main/java/es/uclm/esibuy/backend/services/PerfilService.java:49-55`

```java
public PerfilResponse modificarPerfil(
        String emailAutenticado,
        ModificarUsuarioRequest request) {

    Usuario usuario = buscarUsuarioAutenticado(emailAutenticado);

    administradorService.modificarUsuario(usuario.getId(), request);
```

`backend/src/main/java/es/uclm/esibuy/backend/services/DatosRolUsuario.java:51-79`

```java
private static void modificarDatosCliente(
        Cliente cliente,
        ModificarUsuarioRequest request) {

    if (request.fechaNacimiento() == null) {
        throw new DatosNoValidosException(
                "La fecha de nacimiento es obligatoria.");
    }

    LocalDate fechaLimite =
            LocalDate.now().minusYears(18);

    if (request.fechaNacimiento()
            .isAfter(fechaLimite)) {

        throw new DatosNoValidosException(
                "El cliente debe ser mayor de edad.");
    }

    if (request.dniNif() != null) {
        validarDniNif(request.dniNif());
        cliente.setDniNif(request.dniNif());
    }

    cliente.setFechaNacimiento(
            request.fechaNacimiento());

    if (request.esPremium() != null) {
        cliente.setEsPremium(request.esPremium());
```

**Cómo comprobarlo:** como cliente estándar, enviar `PUT /usuarios/perfil` con sus datos y `"esPremium": true`, y consultar el perfil.

### H-02 y H-03 – Filtros que comparan la ruta sin decodificar

Los dos filtros usan `getRequestURI()`, que llega codificado; Spring MVC y la autorización sí decodifican.

`backend/src/main/java/es/uclm/esibuy/backend/security/LimiteRegistroFilter.java:51`

```java
return !HttpMethod.POST.matches(request.getMethod()) || !RUTAS.contains(request.getRequestURI());
```

`backend/src/main/java/es/uclm/esibuy/backend/security/FiltroImagenFirmada.java:27`

```java
return !request.getRequestURI().startsWith(FirmaImagenService.RUTA_PUBLICA)
```

Resultado de la prueba temporal (con el cupo de altas forzado a agotado):

```
registro /cliente/register -> 429 altas=0
registro /cliente/%72egister -> 202 altas=1
imagen /product-images/foto.png -> 403 bytes=0
imagen /%70roduct-images/foto.png -> 200 bytes=1
imagen /product%2Dimages/foto.png -> 200 bytes=1
```

Alcance: probado con MockMvc, no contra un servidor desplegado. El límite general de 60 peticiones por minuto sigue frenando el abuso del registro, y para aprovechar H-03 hace falta conocer el nombre (UUID) de la imagen.

**Cómo comprobarlo** (con la aplicación local): repetir las peticiones con `curl -k`.

### H-04 – Token de Sonar

Ver el criterio «Gestión de secretos» (3.7). Ya no está en `frontend/sonar-project.properties`; sigue en el de backend y en el historial de Git.

### H-05 y H-06 – App móvil

`mobile/src/app/core/auth/registro.service.ts:27-28`

```typescript
registrarCliente(request: RegistroClienteRequest): Observable<RegistroResponse> {
  return this.http.post<RegistroResponse>(`${environment.apiUrl}/cliente/register`, request);
```

Usa `http.post` directo (sin `postConCsrf`) y se buscó `aceptaPolitica` en `mobile/src` → sin resultados. El backend exige ambos. Deducido del código; no se ha ejecutado la app.

### H-07 – Rutas de estadísticas

`frontend/src/app/app.routes.ts:114`

```typescript
path: 'admin/estadisticas',
```

`frontend/src/app/app.routes.ts:213`

```typescript
path: 'vendedor/estadisticas',
```

Buscado `estadisticas` en `SecurityConfiguration` y `SpaController` → sin resultados.

### H-09 – Credenciales de MongoDB

`docs/CI-CD-Render.md:252`

```markdown
Se deben rotar las credenciales de MongoDB que hayan podido quedar expuestas durante las pruebas.
```

### H-14 – CVE-2026-114938 («Java4Shell»)

Añadido el 26/11/2026, después de la auditoría inicial. Es un fallo de corrupción de memoria en el decodificador `java.util.Base64` de HotSpot, publicado el 17/11/2026 (CVSS 3.1: 8.1; CVSS 4.0: 9.2). Puede llegar a ejecución remota de código.

**Condiciones según los avisos:** Java 17.0.6 o posterior (incluidas las ramas 21, 25 y 27) anterior a las versiones corregidas, CPU x86-64 con AVX-512 VBMI, y datos del atacante que lleguen al decodificador. Corregido en 17.0.21.1, **21.0.13.1**, 25.0.5.1 y 27.0.1.1.

**Cómo afecta a ESIBuy:**

- La imagen usa etiquetas flotantes, así que la versión depende de cuándo se construyó:

`Dockerfile:14`

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS backend-build
```

`Dockerfile:31`

```dockerfile
FROM eclipse-temurin:21-jre
```

- **Entrada del atacante sin autenticación:** la configuración CSRF no cambia el manejador por defecto de Spring Security, `XorCsrfTokenRequestAttributeHandler`. Comprobado con `javap` en `spring-security-web-7.1.2.jar`: su método `getTokenValue` llama a `Base64.getUrlDecoder().decode(...)` con el token que envía el cliente (cabecera `X-XSRF-TOKEN`).

`backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:195-196`

```java
.csrf(csrf -> csrf
        .csrfTokenRepository(csrfTokenRepository))
```

- El código propio también usa `Base64.getDecoder()` (`DatosPersonalesCryptoService`, `TotpCryptoService`), pero sobre claves de entorno y valores cifrados por el servidor.
- Equipo de auditoría: Java 23, rama sin corrección; su CPU (i7-9750H) no tiene AVX-512, así que ahí no se dan las condiciones.
- **No comprobado:** la versión de Java y la CPU del despliegue en Render. No se ha intentado explotar el fallo.

**Corrección propuesta:**

1. Fijar en el `Dockerfile` imágenes con Java 21.0.13.1 o posterior (por ejemplo `eclipse-temurin:21.0.13.1_2-jre`, y la etiqueta de compilación equivalente) y reconstruir en Render sin caché.
2. Mientras tanto, definir en Render `JAVA_TOOL_OPTIONS=-XX:-UseBASE64Intrinsics`, que desactiva el decodificador vulnerable sin tocar código.
3. Actualizar los equipos de desarrollo y el agente del pipeline; abandonar Java 23.

**Criterios de aceptación:** `java -version` dentro del contenedor desplegado muestra 21.0.13.1 o posterior; el `Dockerfile` no usa etiquetas que permitan una versión anterior; el pipeline comprueba la versión mínima.

**Fuentes:** [JFrog](https://research.jfrog.com/post/java4shell-vulnerability/), [watchTowr](https://watchtowr.com/intelligence/java4shell-cve-2026-114938-faq/), [Universidad de Toronto](https://security.utoronto.ca/advisories/security-advisory-critical-remote-code-execution-vulnerability-in-java-java4shell/), [imágenes oficiales de Temurin 21.0.13.1](https://github.com/docker-library/official-images/pull/22809).

## 6. Comprobaciones manuales pendientes

| Requisito | Qué aportar |
|---|---|
| RQ-08 | Capturas en Chrome, Firefox, Edge y Safari, sin violaciones de CSP en la consola |
| RQ-09 | Certificado del despliegue y test TLS externo |
| RQ-11, RQ-13, RQ-14 | Dados por cumplidos según el equipo: incluir en la memoria las capturas del panel, Quality Gate y SonarLint |
| RQ-12 | AGR e informes de MARISMA |
| RQ-17 / 3.5 | Atlas: SCRAM, usuarios y roles, TLS, IP permitidas, cifrado en reposo; rotación de credenciales (H-09) |
| RQ-19 | Capturas de Code Scanning cuando se ejecute, tabla con las decisiones del equipo |
| 3.6 | Límite del proxy de Render; decidir VirusTotal |
| Despliegue | `IMAGENES_FIRMA_KEY` en Render (sin ella no arranca), IP real del cliente en los logs, correos de Brevo (verificación y aviso de bloqueo), índice TTL de auditoría |
| Comparación en tiempo constante | Medir tiempos de login con correo existente e inexistente |
