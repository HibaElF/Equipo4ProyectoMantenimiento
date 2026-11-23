# Progreso de la implementación

> Actualiza este fichero al empezar y al cerrar cada tarea (skill `cerrar-tarea-seguridad`). Estados: `Pendiente`, `En curso`, `Hecha`, `Bloqueada`.

## Línea base (Fase 0)

| Dato | Valor |
|---|---|
| Fecha | 2026-11-20 |
| Rama | `refactor/arreglo_seguridad` |
| Commit de partida | `5c16a3b` |
| Backend: pruebas / fallos / omitidas | 1238 / 0 / 15 (`BackendApplicationTests` excluida) |
| Backend: cobertura de líneas (JaCoCo) | 89,88 % (3934 cubiertas, 443 sin cubrir) |
| Frontend: pruebas / cobertura | 530 pruebas en 39 ficheros, 0 fallos / líneas 78,69 %, sentencias 77,86 %, ramas 71,14 %, funciones 68,54 % |
| Versiones (Java, Node, Docker) | Java 23 (compila a 21), Node 26.13.1 (npm 11.20.0), Docker 29.8.2 |

## Tareas

| Fase | Tarea | Título | Prioridad | Estado | Rama / commit | Fecha | Notas |
|---|---|---|---|---|---|---|---|
| 0 | — | Preparación y línea base | — | Pendiente | | | |
| 1 | T-08 | Respuesta de login en tiempo constante | Media | Hecha | `73fa664` | 2026-11-20 | Suite: 1240 pruebas, 0 fallos, 89,91 %. Pendiente medir a mano 100 intentos (criterio de tiempos). |
| 1 | T-07 | Comprobar datos personales en la contraseña nueva de la recuperación | Baja | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Suite: 1262 pruebas, 0 fallos, 89,96 %. `PasswordPolicy.datosPersonalesDe(Usuario)` reutilizable en T-05. |
| 2 | T-18 | Logs estructurados (JSON) con contexto y correlationId | Media | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Suite: 1281 pruebas, 0 fallos, 90,05 %. `Seudonimizador` (bean) reutilizable en T-19/T-09/T-25. Variable opcional `LOG_FORMAT`. Pendiente verificar a mano el JSON y `X-Correlation-Id` con la app arrancada. |
| 2 | T-20 | Gestión genérica de errores sin detalles internos | Media | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Suite: 1288 pruebas, 0 fallos, 90,05 %. 67 `IllegalArgumentException` migradas a `DatosNoValidosException`; 10 se quedan como error interno. 500 genérico con correlationId vía `ManejadorErroresInesperados` (resolver de último recurso). |
| 2 | T-19 | Auditoría de seguridad ampliada y protegida | Media | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Suite: 1309 pruebas, 0 fallos, 90,34 %. Colección `auditoria` solo inserción con TTL 365d; `GET /administrador/auditoria` (ADMIN). `AuditoriaService.registrarEvento(...)` listo para T-05 y T-09. Limitación: el usuario de MongoDB puede borrar (T-28, de otro miembro). |
| 3 | T-05 | Cambio de contraseña del usuario autenticado | Media | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Backend: 1327 pruebas, 0 fallos, 90,42 %. Frontend: 539 pruebas, 78,8 %. Controlador y servicio nuevos (`CambioContrasena*`) para no tocar `PerfilController`/`PerfilService` (T-04). Sin código de 2º factor. `SesionService.cerrarOtrasSesiones` reutilizable en T-13. |
| 3 | T-13 | Rotar el identificador de sesión al cambiar los factores de autenticación | Baja | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Backend: 1335 pruebas, 0 fallos, 90,45 %. `SesionService.rotarSesion` (reutilizado por T-05). `PerfilController` recibe `SesionService` (3 sitios de prueba adaptados). Sin frontend. |
| 3 | T-06 | Caducidad de contraseñas a los 30 días | Media | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Backend: 1346 pruebas, 0 fallos, 90,49 %. Frontend: 543 pruebas, 78,84 %. Campo `contrasenaCambiadaEn`; `app.security.password.max-age=30d`; cuentas existentes empiezan a contar en su primer login tras el despliegue; 403 con código `CONTRASENA_CADUCADA` y enlace de recuperación en el login. |
| 3 | T-09 | Alertas de intentos fallidos y bloqueos de cuenta | Baja | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-20 | Backend: 1357 pruebas, 0 fallos, 90,21 %. Frontend sin cambios: 543 pruebas, 78,84 %. `registrarFalloDetallado` (bloqueo nuevo) + `AvisoBloqueoService` + correo de aviso (máx. 1/hora y cuenta) + evento `bloqueo_cuenta`. Sin aviso a administradores. |
| 4 | T-22 | Rate limiting general de la API y del envío de códigos OTP | Media | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-23 | Backend: 1375 pruebas, 0 fallos, 90,3 %. Sin frontend. `LimiteApiFilter`/`LimiteApiService` (60/min, en memoria, por instancia); OTP 3/h y 10/día en MongoDB; `LoginAttemptStore.reservar(...)` genérico para T-10; límites por propiedades `app.security.rate-limit.*`. Pendiente comprobar la IP real en Render. |
| 4 | T-11 | Completar la validación de entrada del registro y del login | Baja | Hecha | sin commit (rama `refactor/arreglo_seguridad`) | 2026-11-23 | Backend: 1410 pruebas, 0 fallos, 90,28 %. Frontend: 550 pruebas, 78,88 %, build correcto. Máximos y formatos en los DTO de alta y login; `@ImagenPerfilHttps`/`PatronesEntrada`; alta de administrador con errores por campo; teléfono solo con espacio normal; frontend de registro solo HTTPS y `maxlength`. |
| 4 | T-10 | Proteger el registro público frente al abuso (límite por IP y CSRF) | Media | Pendiente | | | |
| 4 | T-12 | Verificación de la propiedad del correo en el alta | Baja | Pendiente | | | |
| 5 | T-21 | Añadir Content-Security-Policy y cabeceras de seguridad | Baja | Pendiente | | | |
| 5 | T-23 | Permisos finos (authorities) además de los roles | Baja | Pendiente | | | |
| 6 | T-33 | Recodificar las imágenes subidas y eliminar metadatos | Baja | Pendiente | | | |
| 6 | T-35 | Activar el antivirus y reforzar las cabeceras de entrega de imágenes (opcional) | Baja | Pendiente | | | |
| 6 | T-34 | URLs firmadas con caducidad para las imágenes (opcional) | Baja | Pendiente | | | |
| 7 | T-24 | RGPD: política de privacidad, aviso legal y consentimiento | Baja | Pendiente | | | |
| 7 | T-25 | RGPD: exportación de los datos personales del usuario | Baja | Pendiente | | | |
| 7 | T-27 | Incentivar la activación del segundo factor en los clientes | Baja | Pendiente | | | |
| 8 | T-26 | Documentar la correspondencia con CCN-CERT BP/28 | Media | Pendiente | | | |

## Decisiones tomadas con el usuario

| Fecha | Tarea | Decisión |
|---|---|---|
| 2026-11-20 | General | Son 22 tareas (se omitió una). `debugsonar.txt` lo elimina el usuario. |
| 2026-11-20 | Secretos | El token de Sonar se queda de momento en el `.properties`. |
| 2026-11-20 | T-20 | Se migran 67 `IllegalArgumentException` a `DatosNoValidosException` (10 se quedan como error interno); el 500 genérico va en un `HandlerExceptionResolver` de último recurso. |
| 2026-11-20 | T-05 | El cambio de contraseña no pide código del segundo factor; se implementa en `CambioContrasenaController`/`Service` nuevos en lugar de `PerfilController`. |
| 2026-11-20 | T-06 | Cuentas existentes: la fecha se fija en su primer login correcto tras el despliegue. Se renueva por recuperación por correo (sin sesión «pendiente de cambio»). |
| 2026-11-23 | T-11 | Máximos: nombre 100, apellidos 150, nombre comercial 100, sede 150, correo 254, contraseña 128 (también en el alta), imagen 1000 y solo HTTPS; teléfono solo con espacio normal. El alta de administrador devuelve errores por campo. |
| 2026-11-23 | T-22 | Límite general de 60 peticiones por minuto (usuario o IP si es anónimo), excluyendo `/usuarios/csrf`, `/usuarios/sesion-actual` y `/product-images/**`. |
| 2026-11-20 | T-09 | No se avisa a los administradores; solo al titular de la cuenta, como máximo un correo por hora. |
| 2026-11-20 | T-19 | Retención de 12 meses, sin firma HMAC y sin pantalla de consulta en Angular (solo endpoint). |

El token de sonar se tiene que quedar en el propierties por orden del profesor

## Pendientes manuales del usuario

| Tarea | Acción | Hecha |
|---|---|---|
| T-35 | Decidir y, en su caso, activar `VIRUSTOTAL_ENABLED` en Render | No |
| T-18 | Opcional: definir `LOG_FORMAT` en Render (por defecto `ecs`, JSON) y comprobar `X-Correlation-Id` y la línea JSON con la app arrancada | No |
| T-22 | En el despliegue de Render, comprobar con `curl -i` que el campo `ip` del log JSON es la IP real del cliente (no una interna de Render) | No |
| T-09 | Comprobar con Brevo configurado que el titular recibe un único correo al bloquearse su cuenta (5 fallos seguidos) y que un correo inexistente no genera nada | No |
| T-19 | Comprobar con MongoDB real que se crea el índice TTL `ttl_auditoria_fecha` y que `GET /administrador/auditoria` lista eventos | No |


## Notas para el chat de auditoría

Al terminar cada fase, anota aquí qué requisitos (RQ) quedan afectados para que se vuelvan a auditar.

| Fase | Requisitos afectados | Nota |
|---|---|---|
| 3 | RQ-05, RQ-07 | T-05 (cambio de contraseña), T-13 (rotación de sesión al cambiar factores), T-06 (caducidad a 30 días) y T-09 (alertas de bloqueo) afectan a «política de contraseñas», «caducidad», «alertas de intentos fallidos» y «rotación del ID de sesión al cambiar credenciales». Suite completa: backend 1357 pruebas, 0 fallos, 90,21 %; frontend 543 pruebas, 78,84 %. |
| 2 | RQ-15 | T-18 (logs JSON con correlationId), T-20 (errores genéricos sin detalles internos) y T-19 (auditoría persistida y protegida) afectan a «Logs estructurados», «Errores genéricos al cliente» y «Registros de auditoría securizados». Suite completa: backend 1309 pruebas, 0 fallos, 90,34 %; frontend 530 pruebas, 78,69 %. |
| 1 | RQ-05 | T-08 (tiempo constante del login) y T-07 (datos personales al restablecer) afectan a los criterios «Comparación en tiempo constante» y «La contraseña no contiene datos personales». Suite completa: 1262 pruebas, 0 fallos, 89,96 %. |
