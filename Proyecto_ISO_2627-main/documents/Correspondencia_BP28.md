# Correspondencia de ESIBuy con los principios de seguridad del CCN-CERT BP/28

> **Aviso de alcance.** El equipo no dispone del documento oficial CCN-CERT BP/28. Esta tabla **no es una transcripción de su índice**: son los principios de seguridad en el desarrollo de aplicaciones que la auditoría (RQ-15) y el equipo han considerado alineados con el espíritu de esa guía, redactados con palabras propias y contrastados con el código actual. Cuando se consiga el documento oficial, hay que revisar que no falte ningún principio y ajustar los nombres (columna «Principio»). Mientras tanto, esta correspondencia justifica el RQ-15 como **trazabilidad interna**, no como equivalencia literal.
>
> Estado del código: rama `refactor/arreglo_seguridad`, tras las 23 tareas del plan de seguridad (T-xx, ver `requisitos-seguridad/PROGRESO.md`). La evidencia se da por clase o ruta, sin números de línea. Rutas del backend relativas a `backend/src/main/java/es/uclm/esibuy/backend/`.

Estados: **Sí** (medida implementada y probada), **Parcial** (implementada con una limitación conocida), **No** (sin medida), **Manual** (depende de una acción del equipo en el despliegue).

## 1. Control de acceso y mínimo privilegio

| Principio | Medida implementada | Evidencia | Estado | Tarea / hueco |
|---|---|---|---|---|
| Denegación por defecto | Todo requiere autenticación salvo una lista cerrada de rutas públicas | `config/SecurityConfiguration` (`anyRequest().authenticated()`) | Sí | — |
| Mínimo privilegio por rol | Rutas por prefijo (`/cliente/**`, `/vendedor/**`, `/administrador/**`) y `@PreAuthorize` | `config/SecurityConfiguration`, controladores | Sí | — |
| Permisos finos además de roles | Catálogo de 10 permisos, jerarquía de roles y permisos en la sesión | `security/CatalogoPermisos`, `config/SecurityConfiguration` | Sí | T-23 |
| El propietario sale de la sesión | El usuario se toma de la sesión, nunca de la petición | `security/ContextoAutenticacion` | Sí | — |
| Contenedor sin privilegios | La imagen ejecuta con un usuario sin root | `Dockerfile` | Sí | — |
| Usuario de base de datos con el mínimo permiso | El usuario de MongoDB de la aplicación puede borrar la colección de auditoría | Documentado en `docs/CI-CD-Render.md` | Parcial | T-28 (otro miembro) |

## 2. Autenticación y gestión de sesión

| Principio | Medida implementada | Evidencia | Estado | Tarea / hueco |
|---|---|---|---|---|
| Almacenamiento seguro de contraseñas | bcrypt (coste 12) sobre HMAC-SHA256 con pepper; falla al arrancar sin pepper | `security/PepperedBCryptPasswordEncoder` | Sí | — |
| Política de contraseñas | Longitud, complejidad, diccionario de 1.000.000, sin datos personales, historial de 5 | `services/PasswordPolicy` | Sí | T-07 (datos personales al restablecer) |
| Caducidad y cambio de contraseña | Caducidad a 30 días y cambio autenticado | `services/CambioContrasenaService`, `Usuario.contrasenaCambiadaEn` | Sí | T-05, T-06 |
| Recuperación segura | Token de 32 bytes guardado como SHA-256, TTL, un solo uso, respuesta uniforme | `services/RecuperacionContrasenaService` | Sí | — |
| Protección frente a fuerza bruta | Límite por IP y usuario con *backoff*, tiempo de respuesta constante y aviso al titular | `services/LoginAttemptService`, `dao/LoginAttemptStore`, `services/AvisoBloqueoService` | Sí | T-08, T-09 |
| Segundo y tercer factor | TOTP con secreto cifrado y códigos de respaldo; código por correo; obligatorios para ADMIN y VENDEDOR | `services/TotpService`, `services/EmailOtpService` | Sí | — |
| Incentivo del segundo factor | Aviso no bloqueante a los clientes sin TOTP | `frontend/src/app/shared/aviso-segundo-factor/` | Sí | T-27 |
| Límite del envío de códigos | 3 por hora y 10 por día, persistente | `services/EmailOtpService`, `dao/LoginAttemptStore` | Sí | T-22 |
| Gestión de sesión | Cookie HttpOnly, Secure, SameSite=Lax; 30 min de inactividad y 8 h absolutas | `application.properties`, `security/SesionAbsolutaFilter` | Sí | — |
| Rotación del identificador de sesión | Al autenticar y al cambiar contraseña o factores | `services/SesionService` | Sí | T-13 |
| Verificación de la identidad en el alta | El correo se confirma con un enlace de 24 h | `services/VerificacionCorreoService` | Sí | T-12 |

## 3. Validación de entradas y protección de la aplicación web

| Principio | Medida implementada | Evidencia | Estado | Tarea / hueco |
|---|---|---|---|---|
| Validación en el servidor | Bean Validation en los DTO con máximos y formatos | `dto/*`, `validation/*` | Sí | T-11 |
| Consultas sin concatenación | Repositorios y consultas tipadas de Spring Data; sin `$where` | `dao/*` | Sí | — |
| Protección CSRF | Token en cookie y cabecera `X-XSRF-TOKEN`; el registro público ya no está exento | `config/SecurityConfiguration` | Sí | T-10 |
| Cabeceras de seguridad | Content-Security-Policy, Referrer-Policy, Permissions-Policy, nosniff | `config/SecurityConfiguration` (`POLITICA_CONTENIDO`) | Sí | T-21; comprobación en navegador pendiente (Manual) |
| Límite general de peticiones | 60 por minuto por usuario o IP; 5 altas por IP cada 15 min | `security/LimiteApiFilter`, `security/LimiteRegistroFilter` | Parcial | T-22, T-10; el límite general es en memoria y por instancia |
| Subida segura de ficheros | Tamaño, firma real, extensión, `Content-Type`, recodificación y eliminación de metadatos, nombre UUID | `services/ProductoImagenService` | Sí | T-33 |
| Antivirus de las subidas | Integración con VirusTotal, desactivada por defecto | `services/VirusTotalService` | Manual | T-35: decidir `VIRUSTOTAL_ENABLED` en Render |
| Entrega segura de imágenes | Cabeceras restrictivas y URLs firmadas con caducidad | `security/CabecerasEntregaImagen`, `services/FirmaImagenService`, `security/FiltroImagenFirmada` | Sí | T-34, T-35 |

## 4. Protección de la información

| Principio | Medida implementada | Evidencia | Estado | Tarea / hueco |
|---|---|---|---|---|
| Cifrado de datos sensibles en reposo | AES-256-GCM para TOTP, DNI y teléfono | `services/TotpCryptoService`, `services/DatosPersonalesCryptoService`, `config/DatosPersonalesMongoConfiguration` | Sí | — |
| Gestión de secretos | Solo por variables de entorno; `.env` y `.certs/` ignorados por Git; Gitleaks en el pipeline | `.gitignore`, `azure-pipelines.yml` | Parcial | El token de Sonar se queda en el `.properties` por indicación del profesor |
| Fallo seguro | La aplicación no arranca sin pepper ni claves de cifrado o de firma | `PepperedBCryptPasswordEncoder`, `TotpCryptoService`, `FirmaImagenService` | Sí | — |
| Minimización y enmascarado | DNI y teléfono enmascarados en las respuestas | `util/EnmascaradorDatosPersonales` | Sí | — |
| Cifrado en tránsito | HTTPS local y en el despliegue; cookie Secure | `application.properties`, `scripts/configurar-https.ps1` | Sí | — |

## 5. Registro, auditoría y gestión de errores

| Principio | Medida implementada | Evidencia | Estado | Tarea / hueco |
|---|---|---|---|---|
| Registro estructurado con contexto | Logs JSON con `correlationId`, sin datos personales (identificadores seudonimizados) | `security/ContextoLogFilter`, `security/Seudonimizador` | Sí | T-18; verificar con la app arrancada (Manual) |
| Auditoría de eventos de seguridad | Colección `auditoria` solo inserción con retención de 12 meses y consulta para ADMIN | `services/AuditoriaService`, `controllers/AuditoriaController` | Parcial | T-19; depende de T-28 (permisos de MongoDB) |
| Errores genéricos al cliente | Sin trazas ni mensajes internos; 500 con identificador de correlación | `controllers/ManejadorErroresInesperados`, `exceptions/DatosNoValidosException` | Sí | T-20 |
| Anti-enumeración de cuentas | Registro con 202 uniforme, recuperación con respuesta única y mensaje de login único | `controllers/RegistrationExceptionHandler` | Sí | — |

## 6. Privacidad (RGPD)

| Principio | Medida implementada | Evidencia | Estado | Tarea / hueco |
|---|---|---|---|---|
| Información y consentimiento | Política de privacidad, aviso legal y casilla obligatoria con versión y fecha guardadas | `documents/rgpd/`, `model/PoliticaPrivacidad` | Parcial | T-24; textos con `[COMPLETAR]` pendientes de revisión del equipo |
| Derecho de acceso y portabilidad | `GET /usuarios/mis-datos` con JSON descargable, limitado a 1 por minuto | `services/ExportacionDatosService` | Sí | T-25 |
| Derecho de supresión | Baja de cuenta | `services/BajaUsuarioService` | Sí | — |
| Registro de actividades y retención | Documentados | `documents/rgpd/registro-actividades-tratamiento.md`, `documents/rgpd/politica-retencion.md` | Parcial | Revisión del equipo pendiente |

## 7. Ciclo de vida, dependencias y despliegue

| Principio | Medida implementada | Evidencia | Estado | Tarea / hueco |
|---|---|---|---|---|
| Componentes actualizados | OWASP Dependency-Check y `npm audit` en el pipeline | `azure-pipelines.yml` | Sí | — |
| Análisis estático y calidad | SonarQube, JaCoCo con mínimo del 60 % (actual 90,28 %) y CodeQL | `azure-pipelines.yml`, `pom.xml` | Parcial | El workflow de CodeQL está en `Proyecto_ISO_2627-main/.github/`, que GitHub no ejecuta |
| Pruebas de seguridad automatizadas | 1545 pruebas en el backend y 588 en el frontend | `backend/src/test`, `frontend/src/**/*.spec.ts` | Sí | — |
| Despliegue documentado | Variables y pasos en `docs/CI-CD-Render.md` | `docs/CI-CD-Render.md` | Sí | — |
| Copias de seguridad y recuperación | Sin medida propia en el repositorio (depende de MongoDB Atlas) | — | No | Sin tarea asignada: decidirlo en el equipo |

## Resumen

- **Sí:** la mayoría de los principios.
- **Parcial:** usuario de MongoDB con mínimo permiso (T-28), auditoría (T-19 y T-28), límite general en memoria (T-22), gestión de secretos (token de Sonar), textos RGPD pendientes (T-24), análisis estático (CodeQL fuera de la raíz de GitHub).
- **Manual:** VirusTotal (T-35) y verificaciones con la aplicación arrancada (T-18, T-21).
- **No:** copias de seguridad y recuperación, sin tarea asignada.

## Revisión

- [ ] El equipo ha revisado la tabla.
- [ ] Se ha contrastado con el CCN-CERT BP/28 oficial cuando esté disponible.
- [ ] Se ha incluido en el apartado del RQ-15 de la memoria (`memoria/Memoria_SSS_P1.docx`).

Documentación relacionada: [`rgpd/`](rgpd/), `../docs/CI-CD-Render.md` y `../../requisitos-seguridad/PROGRESO.md`.
