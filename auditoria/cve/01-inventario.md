# 01 · Inventario

Fecha: 2026-11-26 · Repositorio: `Develop`, commit `caf0d5a` · Inventario estático en `inventory.csv` y `manifest.json`.

| Componente | Declarada | Resuelta | En ejecución | Evidencia |
|---|---|---|---|---|
| Java (imagen del despliegue) | `eclipse-temurin:21-jre` (etiqueta flotante) | DESCONOCIDA | DESCONOCIDA | `Dockerfile:31` |
| Java (compilación en imagen) | `maven:3.9-eclipse-temurin-21` | DESCONOCIDA | — | `Dockerfile:14` |
| Java (equipo de auditoría) | `java.version` 21 | — | Oracle JDK **23** (rama sin soporte) | `java -XshowSettings` |
| Spring Boot | 4.1.2 | 4.1.2 | DESCONOCIDA | `backend/pom.xml`, `mvn dependency:tree` |
| Spring Framework | gestionada | 7.0.10 | — | árbol Maven |
| Spring Security | gestionada | 7.1.2 | — | árbol Maven |
| Spring Data MongoDB | gestionada | 5.1.2 | — | árbol Maven |
| MongoDB Java Driver | gestionada | 5.8.1 | — | árbol Maven |
| Apache Tomcat embebido | gestionada | 11.0.27 | — | árbol Maven |
| Jackson / Logback / SnakeYAML | gestionadas | 3.1.8 / 1.5.38 / 2.6 | — | árbol Maven |
| ZXing | 3.5.3 | 3.5.3 | — | árbol Maven |
| Angular (web) | ^22.2.5 | 22.2.5 | — | `frontend/package-lock.json` |
| Angular (móvil) | ^22.3.0 | 22.3.0 | — | `mobile/package-lock.json` |
| Android (móvil) | AndroidX, Cordova 14.0.1, Gradle 8.14.3 | solo declaradas | — | `mobile/android/*.gradle` |
| Node (compilación en imagen) | `node:24-bookworm-slim` | DESCONOCIDA | no está en la imagen final | `Dockerfile:2` |
| Node (equipo) | — | — | 26.13.1 | `node -v` |
| MongoDB Server (Atlas) | — | DESCONOCIDA | DESCONOCIDA | externo |
| CPU del despliegue | — | — | DESCONOCIDA | externo |
| CPU del equipo | — | — | i7-9750H, sin AVX-512 | `/proc/cpuinfo` |

Paquetes consultados en OSV: 838 distintos (Maven resuelto y los dos `package-lock.json`). **OSV no devolvió ningún aviso** y `npm audit` dio 0 en web y móvil. Los avisos de este informe salen de NVD y de las páginas de los fabricantes, que van por delante de esas bases.
