# 05 · Remediación

Ordenada por urgencia. No se ha aplicado ninguna.

| Orden | Acción | Resuelve | Dónde |
|---|---|---|---|
| 0 | Variable `JAVA_TOOL_OPTIONS=-XX:-UseBASE64Intrinsics` | Mitiga solo Java4Shell | Render |
| 1 | Fijar imagen de ejecución y de compilación con Java **21.0.13.1+2** o posterior, preferiblemente por *digest*, y reconstruir sin caché | Java4Shell y el resto de CVE de Java del ranking | `Dockerfile:14` y `:31` |
| 2 | Actualizar a Spring Boot **4.1.3** (trae Spring Security 7.1.3 y Framework 7.0.11) | CVE de Spring Security de noviembre | `backend/pom.xml` |
| 3 | Forzar `tomcat.version` **11.0.29** | CVE-2026-118233 y demás de Tomcat | `backend/pom.xml` |
| 4 | Comprobar que Spring Data MongoDB queda en **5.1.3** | CVE-2026-59342 | árbol Maven |
| 5 | Actualizar el driver de MongoDB cuando lo gestione Spring Boot (5.9.2 corrige CVE-2026-18710) | Driver | árbol Maven |
| 6 | Sustituir Java 23 en los equipos y fijar la versión mínima en el pipeline | Entornos de desarrollo y CI | equipos, `azure-pipelines.yml` |
| 7 | Reconstruir con Node 24.22.3 o posterior | CVE de Node (solo compilación) | `Dockerfile:2` |

**Sin verificar:** que Spring Boot 4.1.3 gestione Tomcat 11.0.29, Data MongoDB 5.1.3 o un driver corregido. Hay que mirarlo con `mvn dependency:tree` tras actualizar. No consta versión OSS corregida para Java 23.

**Regresión:** `./mvnw -B clean verify -Dtest='!BackendApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false` (1681 pruebas de referencia), `npm test` en `frontend/` (638), subida de imágenes, login con CSRF, envío de correo y conexión a MongoDB.
