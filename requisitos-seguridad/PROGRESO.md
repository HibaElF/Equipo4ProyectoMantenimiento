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
| 2 | T-18 | Logs estructurados (JSON) con contexto y correlationId | Media | Pendiente | | | |
| 2 | T-20 | Gestión genérica de errores sin detalles internos | Media | Pendiente | | | |
| 2 | T-19 | Auditoría de seguridad ampliada y protegida | Media | Pendiente | | | |
| 3 | T-05 | Cambio de contraseña del usuario autenticado | Media | Pendiente | | | |
| 3 | T-13 | Rotar el identificador de sesión al cambiar los factores de autenticación | Baja | Pendiente | | | |
| 3 | T-06 | Caducidad de contraseñas a los 30 días | Media | Pendiente | | | |
| 3 | T-09 | Alertas de intentos fallidos y bloqueos de cuenta | Baja | Pendiente | | | |
| 4 | T-22 | Rate limiting general de la API y del envío de códigos OTP | Media | Pendiente | | | |
| 4 | T-11 | Completar la validación de entrada del registro y del login | Baja | Pendiente | | | |
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

El token de sonar se tiene que quedar en el propierties por orden del profesor

## Pendientes manuales del usuario

| Tarea | Acción | Hecha |
|---|---|---|
| T-35 | Decidir y, en su caso, activar `VIRUSTOTAL_ENABLED` en Render | No |


## Notas para el chat de auditoría

Al terminar cada fase, anota aquí qué requisitos (RQ) quedan afectados para que se vuelvan a auditar.

| Fase | Requisitos afectados | Nota |
|---|---|---|
| 1 | RQ-05 | T-08 (tiempo constante del login) y T-07 (datos personales al restablecer) afectan a los criterios «Comparación en tiempo constante» y «La contraseña no contiene datos personales». Suite completa: 1262 pruebas, 0 fallos, 89,96 %. |
