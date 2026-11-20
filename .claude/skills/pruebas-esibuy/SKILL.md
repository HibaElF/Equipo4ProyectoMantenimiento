---
name: pruebas-esibuy
description: Convenciones y comandos para escribir y ejecutar pruebas en ESIBuy (JUnit 5 + Mockito + MockMvc en el backend, Vitest en el frontend). Úsala al crear o modificar pruebas de una tarea de seguridad, o al ejecutar la suite y medir cobertura.
---

# Pruebas en ESIBuy

Imita siempre la prueba vecina más parecida: `Grep`/`Read` en `Proyecto_ISO_2627-main/backend/src/test/java/es/uclm/esibuy/backend/` (carpetas `controllers`, `services`, `dao`, `dto`, `model`, `config`, `security`) antes de escribir una nueva.

## Backend

### Convenciones generales

- **Nombres en español** y descriptivos, en minúsculas camel: `autenticaUsuarioActivoYNormalizaElCorreo`, `rechazaContrasenaCaducada`.
- Una prueba por comportamiento. Prueba **también los casos negativos** (401, 403, 400, 429), no solo el camino feliz. En seguridad, los negativos son lo importante.
- No uses tiempos reales ni `Thread.sleep`: inyecta un `Clock` (patrón de `EmailOtpService`, `LimiteSolicitudesRecuperacion`).
- No afirmes tiempos de ejecución (son inestables). Verifica con Mockito que se ejecuta la operación costosa.
- Las claves y secretos de prueba son valores inventados y claramente falsos. El *pepper* de las pruebas lo fija el `pom.xml` (propiedad del sistema de Surefire).

### Pruebas de servicio

`@ExtendWith(MockitoExtension.class)`, dependencias con `@Mock` y el servicio construido a mano en `@BeforeEach` (ejemplo: `AuthServiceTests`). Si cambias la firma de un constructor, actualiza **todas** las pruebas que lo construyen (`Grep "new NombreDelServicio("`).

### Pruebas de controlador y de seguridad

`@WebMvcTest(controllers = {...})` con `@Import(SecurityConfiguration.class)`, `@Autowired MockMvc` y cada dependencia como `@MockitoBean` (ejemplo: `AuthControllerSecurityTests`). Imports de Spring Boot 4:

- `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest`
- `org.springframework.test.context.bean.override.mockito.MockitoBean`
- `SecurityMockMvcRequestPostProcessors.csrf` y `.user(...)`, con `MockMvcRequestBuilders` y `MockMvcResultMatchers`.

Reglas: toda petición que modifica estado lleva `csrf()`; para un usuario autenticado, `user("correo").roles("CLIENTE")`; para probar sesiones, `MockHttpSession` (ejemplo: `AuthControllerSesionTests`).

### Pruebas de DTO y de configuración

- Validación de DTO con un `Validator` de Bean Validation, como `DireccionRequestTest`.
- Propiedades de `application.properties`: `ConfiguracionHttpsTests` lee el fichero y comprueba valores.

### Ojo con

- `roles(...)` se usa unas 265 veces: no cambies cómo se construyen las autoridades sin una estrategia que no rompa las pruebas.
- Hay pruebas de integración con MongoDB (por ejemplo `PedidoMongoIntegrationTests`); si fallan por conexión y no es por tu cambio, **avisa** y no las toques.
- Las imágenes de prueba del módulo de imágenes pueden ser cabeceras mínimas que `ImageIO` no decodifica: genera imágenes reales con `BufferedImage` cuando decodifiques.

### Comandos (desde `Proyecto_ISO_2627-main/backend`)

| Qué | Comando |
|---|---|
| Una clase | `./mvnw -q test -Dtest=NombreTests` |
| Varias | `./mvnw -q test -Dtest='ATests,BTests'` |
| Todo con cobertura | `./mvnw -B clean verify -Dtest='!BackendApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false` |

`BackendApplicationTests` necesita MongoDB y **se excluye siempre**. La suite completa tarda varios minutos: lánzala en segundo plano y solo al cerrar una tarea o una fase. JaCoCo exige ≥ 60 % de líneas (el informe queda en `target/site/jacoco/`). Cuando termines, lee el resultado de la ejecución para dar los números reales: pruebas, fallos, omitidas y cobertura.

## Frontend

- Las pruebas son `*.spec.ts` junto al fichero que prueban (Vitest + jsdom, lanzadas con `ng test`). Copia el estilo del `.spec.ts` vecino (componentes con `TestBed`, servicios con el cliente HTTP de pruebas).
- Cada servicio que hace `POST/PUT/DELETE` pide antes `GET /usuarios/csrf`: las pruebas deben cubrir esa secuencia.
- Comandos (desde `Proyecto_ISO_2627-main/frontend`): `npm test -- --watch=false --coverage` y `npm run build`.
- **Requiere Node ≥ 22.22.3.** Comprueba `node -v`; si es menor (en la auditoría era 22.14.0), no puedes ejecutar las pruebas del frontend: dilo, escribe igualmente los `.spec.ts` y márcalos como «sin ejecutar» en el resumen.

## Qué contar al terminar

Pruebas añadidas y modificadas (nombres), resultado de las ejecuciones con números, cobertura frente a la línea base y todo lo que no se ha podido ejecutar y por qué.
