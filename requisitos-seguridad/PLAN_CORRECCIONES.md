# Plan de correcciones (tras la segunda auditoría)

- **Origen:** `auditoria/resultado-auditoria.md` (hallazgos H-xx) y `auditoria/cve/` (CVE). Punto de partida: `Develop`, commit `caf0d5a`.
- **Fecha:** 26/11/2026.
- **Para quién:** el chat de implementación. Estas tareas (C-xx) **amplían** el alcance de las 23 del plan anterior; `CLAUDE.md` todavía no las menciona, así que el usuario debe indicarlo en el prompt (ver el final).
- **Reglas:** las de `contexto/REGLAS_DE_TRABAJO.md` (una tarea cada vez, plan y visto bueno antes de editar, sin commit ni push, sin secretos). Localiza el código por clase y método, no por línea. Antes de tocar un fichero compartido, `git fetch` y `git log origin/Develop -- <fichero>`.

## Seguimiento

| Orden | Tarea | Título | Origen | Prioridad | Estado | Fecha / notas |
|---|---|---|---|---|---|---|
| 0 | C-00 | Mitigación de Java4Shell en Render | H-14 | Urgente | Pendiente (manual) | |
| 1 | C-01 | Fijar Java 21 corregido | H-14, CVE de Java | Alta | Hecha (falta comprobación manual) | 26/11/2026: `docker build` correcto; Java 21.0.13.1 en la imagen final y en la de compilación (Maven 3.10.0); paso del pipeline probado con versiones simuladas (no en el agente); backend 1681 pruebas, 0 fallos, 91,42 %. Manual: actualizar el JDK del agente `wsl-ubuntu` y los equipos, y comprobar en Render tras reconstruir sin caché |
| 2 | C-02 | Actualizar Spring Boot y Tomcat | `auditoria/cve/05` | Alta | Hecha | 26/11/2026: Spring Boot 4.1.3, Spring Security 7.1.3, Spring Data MongoDB 5.1.3, Tomcat 11.0.29 (forzado con `tomcat.version`, acordado con el usuario), Spring Framework 7.0.11, driver 5.8.1, Jackson 3.1.8 (quitado el forzado, ya lo trae Boot). Backend 1681 pruebas, 0 fallos, 91,42 %; JAR de la imagen Docker revisado |
| 3 | C-03 | Impedir premium sin pago | H-01 | Alta | Otro miembro | No la implementa este chat |
| 4 | C-04 | Filtros que no se salten con la ruta codificada | H-02, H-03 | Media | Pendiente | |
| 5 | C-05 | Arreglar el registro desde la app móvil | H-06 | Media | Otro miembro | No la implementa este chat |
| 6 | C-06 | HTTPS en la app móvil | H-05, RQ-09 | Media | Otro miembro | No la implementa este chat |
| 7 | C-07 | Rutas de estadísticas | H-07 | Baja | Pendiente | |
| 8 | C-08 | Hacer que CodeQL se ejecute | H-08, RQ-19 | Media | Pendiente | |
| 9 | C-09 | Quitar código sin uso | H-13, RQ-13 | Baja (opcional) | Pendiente | |

---

### C-00 · Mitigación inmediata de Java4Shell (la hace el usuario)

En Render, añadir la variable de entorno `JAVA_TOOL_OPTIONS=-XX:-UseBASE64Intrinsics` (si ya existe, añadir la opción al valor) y redesplegar.

**Criterios de aceptación**
- [ ] El log de arranque muestra `Picked up JAVA_TOOL_OPTIONS` con la opción.
- [ ] Login, subida de imagen y recuperación de contraseña siguen funcionando.

Se puede retirar cuando C-01 esté desplegada y comprobada.

### C-01 · Fijar una versión de Java corregida

**Por qué:** `Dockerfile` usa `maven:3.9-eclipse-temurin-21` y `eclipse-temurin:21-jre`, etiquetas flotantes. Java4Shell (CVE-2026-114938) es alcanzable sin autenticación por la cabecera CSRF.

**Cómo**
1. Imagen de ejecución: `eclipse-temurin:21.0.13.1_2-jre` o posterior.
2. Imagen de compilación: elegir una etiqueta de Maven con Java 21.0.13.1 o posterior. **No está verificada la etiqueta exacta:** compruébala antes con `docker run --rm <imagen> java -version`.
3. Valorar fijar ambas por *digest* y anotar cómo se actualizarán.
4. `azure-pipelines.yml`: el paso «Comprobar Java 21» solo mira que empiece por `21`; exigir 21.0.13.1 como mínimo (el agente es del usuario: avisar).
5. Documentarlo en `docs/CI-CD-Render.md`.

**Preguntar al usuario:** si quiere *digest* o solo etiqueta; si puede actualizar el agente del pipeline y los equipos (Java 23 no consta que vaya a recibir parche).

**Pruebas:** `docker build` y `java -version` dentro de la imagen; suite del backend.

**Criterios de aceptación**
- [ ] `java -version` en la imagen final muestra 21.0.13.1 o posterior.
- [ ] El `Dockerfile` no admite una versión anterior.
- [ ] El pipeline falla con un Java anterior al mínimo.
- [ ] Manual: comprobado en Render tras reconstruir sin caché.

### C-02 · Actualizar Spring Boot y Tomcat

**Por qué:** Spring Security 7.1.2, Spring Data MongoDB 5.1.2 y Tomcat 11.0.27 figuran en avisos de noviembre de 2026. Solo la de Tomcat (CVE-2026-118233) entra en el ranking; en las demás no se han encontrado las condiciones.

**Cómo**
1. `backend/pom.xml`: `spring-boot-starter-parent` a **4.1.3**.
2. Ejecutar `./mvnw dependency:tree` y anotar Tomcat, Spring Security, Spring Data MongoDB y driver resueltos.
3. Si Tomcat queda por debajo de 11.0.29, definir `<tomcat.version>11.0.29</tomcat.version>` (comprobar que existe en Maven Central).
4. Si Data MongoDB queda por debajo de 5.1.3, valorar `spring-data-bom.version`. No forzar el driver sin consultarlo.

**Preguntar al usuario:** si el árbol obliga a forzar versiones fuera de lo que gestiona Spring Boot.

**Pruebas:** `./mvnw -B clean verify -Dtest='!BackendApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false` (referencia: 1681 pruebas, 0 fallos, 91,4 %).

**Criterios de aceptación**
- [ ] Árbol: Spring Security ≥ 7.1.3, Tomcat ≥ 11.0.29, Data MongoDB ≥ 5.1.3 (o motivo anotado).
- [ ] Suite sin fallos nuevos.
- [ ] Versiones resueltas anotadas en la tabla de seguimiento (los informes de `auditoria/cve/` los actualiza el chat de auditoría).

### C-03 · Impedir premium sin pago desde el perfil

**Por qué:** `PerfilService.modificarPerfil` reutiliza `AdministradorService.modificarUsuario`, y `DatosRolUsuario.modificarDatosCliente` aplica `esPremium`. Un cliente puede enviar `PUT /usuarios/perfil` con `esPremium: true` sin pasar por el pago de `PUT /cliente/tipo`.

**Cómo**
- La modificación del propio perfil no debe aplicar `esPremium` (ignorarlo o responder 400). El administrador sigue pudiendo cambiarlo.
- Revisar también `categoriaId` para vendedores: decidir si puede cambiar la suya.
- **No quitar** la edición del propio DNI: la web y la app móvil la ofrecen.
- Opcional en la misma tarea: `@Valid` y longitudes máximas en `ModificarUsuarioRequest` (usar `PatronesEntrada`), para el perfil y para el administrador.

**Preguntar al usuario:** ignorar o rechazar `esPremium`; si el vendedor puede cambiar su categoría; si se incluye la validación.

**Coordinación:** `PerfilController`/`PerfilService` los toca la tarea T-04 de otro miembro.

**Pruebas:** servicio y controlador: cliente estándar que envía `esPremium: true` sigue estándar; cliente premium que no lo envía sigue premium; el administrador sí puede; la edición de DNI sigue funcionando.

**Criterios de aceptación**
- [ ] `PUT /usuarios/perfil` nunca cambia el tipo de cliente.
- [ ] El pago premium por `PUT /cliente/tipo` funciona igual.
- [ ] El perfil web y el móvil siguen guardando sus datos.

### C-04 · Que los filtros no se salten con la ruta codificada

**Por qué:** `LimiteRegistroFilter` y `FiltroImagenFirmada` comparan `request.getRequestURI()`, que llega sin decodificar. Reproducido: `/cliente/%72egister` salta el límite (202 frente a 429) y `/%70roduct-images/…` sirve la imagen sin firma (200 frente a 403).

**Cómo**
- Usar el mismo emparejador de rutas que la autorización (en Spring Security 7, `PathPatternRequestMatcher`; **verificar su API** antes de escribir código) en lugar de comparar cadenas.
- En el filtro de imágenes, obtener el nombre del fichero ya decodificado para verificar la firma.
- Revisar con el mismo criterio las exclusiones de `LimiteApiFilter`.

**Pruebas:** casos con `%72egister`, `%70roduct-images` y `product%2Dimages` en los tres filtros; las URLs firmadas legítimas siguen funcionando en modo local y `mongo`.

**Criterios de aceptación**
- [ ] Con el cupo agotado, la ruta codificada de registro responde 429 (cliente y vendedor).
- [ ] Una imagen sin firma responde 403 con cualquier codificación de la ruta.
- [ ] Las pruebas existentes siguen en verde.

### C-05 · Arreglar el registro desde la app móvil

**Por qué:** `mobile/src/app/core/auth/registro.service.ts` usa `http.post` sin token CSRF y la petición no lleva `aceptaPolitica`. El backend exige ambos.

**Cómo**
- Usar `AuthService.postConCsrf`.
- Añadir la casilla obligatoria de política de privacidad, con enlace a la política web, y enviar `aceptaPolitica`.
- Revisar de paso cómo muestra la app los 403 de login (correo sin verificar, contraseña caducada) y el 429 del registro.

**Pruebas:** `.spec.ts` del servicio y de la página (`npm run test:cobertura` en `mobile/`; requiere instalar dependencias con permiso del usuario).

**Criterios de aceptación**
- [ ] El registro desde la app responde 202 contra el backend actual.
- [ ] No se puede enviar sin aceptar la política.
- [ ] Un 403 de correo sin verificar o contraseña caducada se muestra con un mensaje comprensible.

### C-06 · HTTPS en la app móvil

**Por qué:** los entornos usan `http://`, y `capacitor.config.ts` y el `AndroidManifest.xml` permiten tráfico en claro y contenido mixto; `allowBackup="true"`.

**Cómo**
- Un entorno de distribución con la URL HTTPS del despliegue.
- Quitar `server.cleartext`, `allowMixedContent` y `usesCleartextTraffic` en la compilación de distribución; si el desarrollo local los necesita, limitarlos a *debug*.
- `android:allowBackup="false"` o reglas que excluyan las cookies.

**Preguntar al usuario:** URL HTTPS del despliegue; si el desarrollo local seguirá por HTTP.

**Criterios de aceptación**
- [ ] La compilación de distribución no permite tráfico en claro.
- [ ] Manual: la app funciona contra el backend por HTTPS (sesión, CSRF e imágenes).

### C-07 · Rutas de estadísticas

**Por qué:** `/admin/estadisticas` y `/vendedor/estadisticas` están en `app.routes.ts` pero no en `SpaController` ni en las rutas HTML permitidas de `SecurityConfiguration`.

**Cómo:** añadirlas en los dos sitios.

**Criterios de aceptación**
- [ ] Recargar cualquiera de las dos muestra la pantalla.
- [ ] Prueba que cubre ambas rutas (como `PaginasLegalesPublicasTests`).

### C-08 · Hacer que CodeQL se ejecute

**Por qué:** el workflow está en `Proyecto_ISO_2627-main/.github/workflows/`; GitHub solo lee la `.github` de la raíz.

**Cómo**
- Mover a `.github/workflows/codeql.yml` en la raíz.
- `working-directory: Proyecto_ISO_2627-main/backend`.
- Incluir la rama `Develop` con esa grafía (el filtro dice `develop`).
- Añadir `kotlin` no hace falta; valorar que el análisis de JavaScript cubra `mobile/`.

**Criterios de aceptación**
- [ ] Manual: el workflow se ejecuta tras el push y aparecen resultados en *Code scanning*.
- [ ] Las alertas quedan listadas para el informe del RQ-19. **La decisión sobre cada una la toma el equipo**, no el asistente.

### C-09 · Quitar código sin uso (opcional)

`MetodoPagoController.consultarMetodosPago` no tiene mapeo HTTP y solo lo usan pruebas (igual `PagoSimuladoService.consultarMetodosPago`).

**Criterios de aceptación**
- [ ] Sin métodos muertos y suite en verde.

---

## Fuera de este plan

| Asunto | Motivo |
|---|---|
| Token de Sonar versionado (H-04) | El equipo lo mantiene por orden del profesor; conviene tenerlo por escrito. El *Secret Scan* del pipeline previsiblemente fallará mientras siga |
| Borrar clientes y vendedores (RQ-04), usuarios de MongoDB (RQ-17), AGR (RQ-12) | Tareas de otros miembros o documentos del equipo |
| Rotar credenciales de MongoDB (H-09), capturas de Atlas, versión de MongoDB Server | Manual, en Atlas |
| Textos legales con `[COMPLETAR]` (H-12) | Datos que aporta el equipo |
| Decisiones del informe de IA (RQ-19) | Las toma el equipo |
| BP/28 oficial (RQ-15) | Falta el documento |
| Límites en memoria y reutilización del *pepper* (H-10, H-11) | Mejora de bajo riesgo; no planificada |

## Prompts para el chat de implementación

**Arranque**

```text
Tras una segunda auditoría hay correcciones nuevas en requisitos-seguridad/PLAN_CORRECCIONES.md (tareas C-xx). Te autorizo a implementarlas aunque CLAUDE.md hable solo de las 23 tareas anteriores. Mantén el resto de reglas.

Antes de tocar nada: lee ese plan entero, ejecuta git status y git log -3 --oneline, y confirma que el punto de partida de C-01 sigue siendo cierto. No leas los informes largos de auditoria/ salvo que una tarea lo necesite. Propón el plan de C-01 y espera mi visto bueno.
```

**Cada tarea siguiente**

```text
Siguiente corrección: {C-xx} de requisitos-seguridad/PLAN_CORRECCIONES.md. Usa la skill implementar-tarea-seguridad adaptándola a este plan: verifica el punto de partida, hazme las preguntas marcadas, propón un plan breve y espera mi visto bueno. Al terminar, ciérrala con cerrar-tarea-seguridad y anota el estado en la tabla de seguimiento de PLAN_CORRECCIONES.md.
```

**Para volver al chat de auditoría**

```text
Re-audita las correcciones C-xx ya hechas según requisitos-seguridad/PLAN_CORRECCIONES.md. Solo auditoría: comprueba cada criterio de aceptación con evidencia y actualiza auditoria/resultado-auditoria.md y auditoria/cve/.
```
