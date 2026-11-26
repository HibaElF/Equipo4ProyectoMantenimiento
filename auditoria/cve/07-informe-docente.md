# 07 · Informe: Top 25 CVE de ESIBuy

Fecha: 2026-11-26 · Modo completo · commit `caf0d5a`.

## Resumen ejecutivo

- **Las bibliotecas no aportan avisos en OSV ni en `npm audit`**, pero los fabricantes publicaron en noviembre avisos que sí incluyen vuestras versiones de Spring Security, Spring Data MongoDB, Tomcat y el driver de MongoDB.
- **Ninguna de las CVE de Spring o del driver cumple sus condiciones** en el código actual.
- **24 de las 25 son de Java** y dependen de una sola cosa que no se conoce: el parche que ejecuta el despliegue. **No son 25 vulnerabilidades confirmadas.**
- **1 con versión confirmada en el componente** (Tomcat, CVE-2026-118233).
- **Lo urgente es Java4Shell**, con entrada sin autenticación identificada.
- **Una actualización de la imagen de Java resuelve casi todo el ranking.**

## Top 25

| # | CVE | Componente | CVSS 3.1 | Score local | Estado | Corregida en |
|---|---|---|---|---|---|---|
| 1 | [CVE-2026-114938](https://nvd.nist.gov/vuln/detail/CVE-2026-114938) | JDK 21 · Compiler | 8.1 | 93 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 2 | [CVE-2026-114820](https://nvd.nist.gov/vuln/detail/CVE-2026-114820) | JDK 21 · JSSE | 9.1 | 64 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 3 | [CVE-2026-91403](https://nvd.nist.gov/vuln/detail/CVE-2026-91403) | JDK 21 · JSSE | 9.1 | 64 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 4 | [CVE-2026-114940](https://nvd.nist.gov/vuln/detail/CVE-2026-114940) | JDK 21 · JSSE | 7.4 | 60 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 5 | [CVE-2026-118233](https://tomcat.apache.org/security-11.html) | Apache Tomcat embebido | 7.5 | 53 | CONFIRMADA_EN_COMPONENTE | 11.0.29 |
| 6 | [CVE-2026-91415](https://nvd.nist.gov/vuln/detail/CVE-2026-91415) | JDK 21 · 2D | 7.0 | 50 | NO_VERIFICADA | 21.0.13 o posterior |
| 7 | [CVE-2026-114941](https://nvd.nist.gov/vuln/detail/CVE-2026-114941) | JDK 21 · Compiler | 7.0 | 46 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 8 | [CVE-2026-91398](https://nvd.nist.gov/vuln/detail/CVE-2026-91398) | JDK 21 · Networking | 6.8 | 45 | NO_VERIFICADA | 21.0.13 o posterior |
| 9 | [CVE-2026-83374](https://nvd.nist.gov/vuln/detail/CVE-2026-83374) | JDK 21 · Security | 5.9 | 45 | NO_VERIFICADA | 21.0.13 o posterior |
| 10 | [CVE-2026-91394](https://nvd.nist.gov/vuln/detail/CVE-2026-91394) | JDK 21 · Networking | 5.9 | 45 | NO_VERIFICADA | 21.0.13 o posterior |
| 11 | [CVE-2026-114943](https://nvd.nist.gov/vuln/detail/CVE-2026-114943) | JDK 21 · Hotspot | 6.5 | 43 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 12 | [CVE-2026-114944](https://nvd.nist.gov/vuln/detail/CVE-2026-114944) | JDK 21 · Core Java Libraries | 5.9 | 43 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 13 | [CVE-2026-114942](https://nvd.nist.gov/vuln/detail/CVE-2026-114942) | JDK 21 · Libraries | 7.0 | 42 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 14 | [CVE-2026-91373](https://nvd.nist.gov/vuln/detail/CVE-2026-91373) | JDK 21 · JSSE | 5.3 | 40 | NO_VERIFICADA | 21.0.13 o posterior |
| 15 | [CVE-2026-91418](https://nvd.nist.gov/vuln/detail/CVE-2026-91418) | JDK 21 · ImageIO | 5.3 | 40 | NO_VERIFICADA | 21.0.13 o posterior |
| 16 | [CVE-2026-83395](https://nvd.nist.gov/vuln/detail/CVE-2026-83395) | JDK 21 · Networking | 6.5 | 39 | NO_VERIFICADA | 21.0.13 o posterior |
| 17 | [CVE-2026-87294](https://nvd.nist.gov/vuln/detail/CVE-2026-87294) | JDK 21 · Security | 6.5 | 39 | NO_VERIFICADA | 21.0.13 o posterior |
| 18 | [CVE-2026-91375](https://nvd.nist.gov/vuln/detail/CVE-2026-91375) | JDK 21 · Libraries | 4.7 | 39 | NO_VERIFICADA | 21.0.13 o posterior |
| 19 | [CVE-2026-83376](https://nvd.nist.gov/vuln/detail/CVE-2026-83376) | JDK 21 · JSSE | 3.7 | 38 | NO_VERIFICADA | 21.0.13 o posterior |
| 20 | [CVE-2026-91334](https://nvd.nist.gov/vuln/detail/CVE-2026-91334) | JDK 21 · ImageIO | 3.7 | 38 | NO_VERIFICADA | 21.0.13 o posterior |
| 21 | [CVE-2026-91461](https://nvd.nist.gov/vuln/detail/CVE-2026-91461) | JDK 21 · JSSE | 3.7 | 38 | NO_VERIFICADA | 21.0.13 o posterior |
| 22 | [CVE-2026-101516](https://nvd.nist.gov/vuln/detail/CVE-2026-101516) | JDK 21 · Libraries | 6.5 | 37 | NO_VERIFICADA | 21.0.13 o posterior |
| 23 | [CVE-2026-114946](https://nvd.nist.gov/vuln/detail/CVE-2026-114946) | JDK 21 · Compiler | 4.8 | 37 | NO_VERIFICADA | 21.0.13.1 o posterior |
| 24 | [CVE-2026-83378](https://nvd.nist.gov/vuln/detail/CVE-2026-83378) | JDK 21 · Compiler | 4.8 | 37 | NO_VERIFICADA | 21.0.13 o posterior |
| 25 | [CVE-2026-91487](https://nvd.nist.gov/vuln/detail/CVE-2026-91487) | JDK 21 · Compiler | 4.8 | 37 | NO_VERIFICADA | 21.0.13 o posterior |

**Puntuación (0–100):** impacto (0–25, según C/I/A del vector: alto 9, bajo 3) + exposición (0–25, uso del componente en ESIBuy) + explotabilidad (0–20: AC baja 8, alta 4, local 1; Java4Shell 18 por disparador público) + sensibilidad (0–15) + confianza (0–15: 7 versión desconocida, 11 con entrada comprobada, 12 versión confirmada). La exposición y la confianza son juicio de esta auditoría. Java4Shell se fija en primer lugar.

## Matriz CVE → ruta → condición → prueba → acción → estado

| CVE | Ruta | Componente | Prueba | Acción | Estado |
|---|---|---|---|---|---|
| CVE-2026-114938 | `backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:195` | Compiler | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-114820 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | JSSE | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-91403 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | JSSE | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-114940 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | JSSE | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-118233 | `backend/pom.xml (gestionada por spring-boot-starter-parent 4.1.2)` | Tomcat | P-2 | Tomcat 11.0.29 | CONFIRMADA_EN_COMPONENTE |
| CVE-2026-91415 | `backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:250` | 2D | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-114941 | `Dockerfile:31` | Compiler | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-91398 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | Networking | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-83374 | `backend/src/main/java/es/uclm/esibuy/backend/services/TotpCryptoService.java` | Security | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-91394 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | Networking | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-114943 | `Dockerfile:31` | Hotspot | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-114944 | `toda la aplicación` | Core Java Libraries | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-114942 | `toda la aplicación` | Libraries | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-91373 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | JSSE | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-91418 | `backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:199` | ImageIO | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-83395 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | Networking | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-87294 | `backend/src/main/java/es/uclm/esibuy/backend/services/TotpCryptoService.java` | Security | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-91375 | `toda la aplicación` | Libraries | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-83376 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | JSSE | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-91334 | `backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:199` | ImageIO | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-91461 | `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40` | JSSE | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-101516 | `toda la aplicación` | Libraries | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-114946 | `Dockerfile:31` | Compiler | P-1 | Java 21.0.13.1 o posterior | NO_VERIFICADA |
| CVE-2026-83378 | `Dockerfile:31` | Compiler | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |
| CVE-2026-91487 | `Dockerfile:31` | Compiler | P-1 | Java 21.0.13 o posterior | NO_VERIFICADA |

## Plan docente

**Objetivos:** distinguir versión declarada, resuelta y en ejecución; distinguir componente afectado de aplicación vulnerable; priorizar por riesgo propio y no solo por CVSS.

**Tareas de observación**
1. Comparar `backend/pom.xml` con el árbol de dependencias: ¿qué versión de Tomcat aparece en cada uno?
2. Ejecutar P-1 en el despliegue y reclasificar las CVE de Java.
3. Elegir una CVE de `06` y demostrar por qué su condición no se cumple.

**Preguntas para discutir**
- ¿Por qué `npm audit` y OSV daban 0 mientras había avisos publicados?
- ¿Qué riesgo introduce una etiqueta Docker flotante, en los dos sentidos?
- ¿Cómo cambia el análisis que una medida de seguridad (recodificar imágenes) use una biblioteca con CVE?

**Rúbrica:** evidencia citada (30 %), clasificación correcta (30 %), priorización razonada (20 %), remediación con regresión (20 %).
