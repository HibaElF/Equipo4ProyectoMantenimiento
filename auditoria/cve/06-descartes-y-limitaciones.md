# 06 · Descartes y limitaciones

## Componente afectado, pero sin la condición necesaria
Conviene actualizar igualmente: basta que alguien añada la función para que apliquen.

| CVE | Componente | Motivo |
|---|---|---|
| [CVE-2026-59342](https://spring.io/security/cve-2026-59342) | Spring Data MongoDB 5.1.2 (afectada) | Exige consultas con `$where`/`$function` y JavaScript de servidor: ninguna `@Query` los usa |
| [CVE-2026-59330](https://spring.io/security/cve-2026-59330) | Spring Security 7.1.2 (afectada) | Exige WebAuthn: no se usa |
| [CVE-2026-59331](https://spring.io/security/cve-2026-59331) | Spring Security 7.1.2 (afectada) | Exige RSocket: no se usa |
| [CVE-2026-59333](https://spring.io/security/cve-2026-59333) | Spring Security 7.1.2 (afectada) | Exige reglas por IP (`IpAddressMatcher`): no hay |
| [CVE-2026-59273](https://spring.io/security/cve-2026-59273) | Spring Security 7.1.2 (afectada) | Exige `ELRequestMatcher` con datos externos: no se usa |
| [CVE-2026-59329](https://spring.io/security/cve-2026-59329) | Spring Security 7.1.2 (afectada) | Exige autenticación reactiva: la aplicación es servlet |
| [CVE-2026-116830](https://nvd.nist.gov/vuln/detail/CVE-2026-116830) | Tomcat 11.0.27 (afectada) | HTTP/2 no está activado (`server.http2.enabled` no definido) |
| [CVE-2026-116600](https://nvd.nist.gov/vuln/detail/CVE-2026-116600) | Tomcat 11.0.27 (afectada) | Exige WebSocket con el módulo OWB |
| [CVE-2026-118028](https://nvd.nist.gov/vuln/detail/CVE-2026-118028) | Tomcat 11.0.27 (afectada) | Sin reglas de reescritura/redirección en Tomcat |
| [CVE-2026-121649](https://nvd.nist.gov/vuln/detail/CVE-2026-121649) | Tomcat 11.0.27 (afectada) | Sin `ExpiresFilter` |
| [CVE-2026-118436](https://nvd.nist.gov/vuln/detail/CVE-2026-118436) | Tomcat 11.0.27 (afectada) | Sin CGI Servlet |
| [CVE-2026-95517](https://nvd.nist.gov/vuln/detail/CVE-2026-95517) | Tomcat 11.0.27 (afectada) | Sin *clustering* (`EncryptInterceptor`) |
| [CVE-2026-106012](https://nvd.nist.gov/vuln/detail/CVE-2026-106012) | Tomcat 11.0.27 (afectada) | Sin `security-role-ref` |
| [CVE-2026-116561](https://nvd.nist.gov/vuln/detail/CVE-2026-116561) | Tomcat 11.0.27 (afectada) | Sin Jakarta Authentication |
| [CVE-2026-117517](https://nvd.nist.gov/vuln/detail/CVE-2026-117517) | Tomcat 11.0.27 (afectada) | Arreglo incompleto de CVE-2026-25854 (`LoadBalancerDrainingValve`), que no se usa |
| [CVE-2026-133325](https://nvd.nist.gov/vuln/detail/CVE-2026-133325) | Tomcat | El rango es 11.0.28–11.0.29: no incluye 11.0.27 |
| [CVE-2026-118581](https://nvd.nist.gov/vuln/detail/CVE-2026-118581) | MongoDB Driver 5.8.1 | Exige envolver bytes externos en un documento BSON crudo: no hay `RawBsonDocument` |
| [CVE-2026-18710](https://nvd.nist.gov/vuln/detail/CVE-2026-18710) | MongoDB Driver 5.8.1 | Registra credenciales de proxy: no hay proxy configurado en el código (la URI es externa) |

## CVE de Java 21 fuera del alcance de un servidor como este

| CVE | Componente | Motivo |
|---|---|---|
| CVE-2026-114939 | JGSS | solo clientes con applets/Web Start |
| CVE-2026-83380 | JAAS | sin JAAS |
| CVE-2026-83387 | JDBC | no hay base de datos SQL |
| CVE-2026-83400 | JAXP | no se procesa XML (buscado javax.xml, DocumentBuilder, SAXParser) |
| CVE-2026-87290 | JAXP | no se procesa XML (buscado javax.xml, DocumentBuilder, SAXParser) |
| CVE-2026-87367 | JAXP | no se procesa XML (buscado javax.xml, DocumentBuilder, SAXParser) |
| CVE-2026-91335 | AWT | solo clientes con applets/Web Start |
| CVE-2026-91374 | Serviceability | interfaces de diagnóstico no expuestas |
| CVE-2026-91379 | JDK tools | solo clientes con applets/Web Start |
| CVE-2026-91397 | Serviceability | interfaces de diagnóstico no expuestas |
| CVE-2026-91400 | Sound | solo clientes con applets/Web Start |
| CVE-2026-91453 | Lightweight HTTP Server | no se usa com.sun.net.httpserver |
| CVE-2026-91462 | JGSS | sin Kerberos/GSS en el código |
| CVE-2026-91463 | JGSS | solo clientes con applets/Web Start |
| CVE-2026-91464 | JGSS | solo clientes con applets/Web Start |

## Fuera del Top 25 por puntuación (siguen sin verificar; la misma actualización las cubre)

| CVE | Componente | CVSS | Score |
|---|---|---|---|
| [CVE-2026-87291](https://nvd.nist.gov/vuln/detail/CVE-2026-87291) | JDK 21 · Networking | 5.3 | 36 |
| [CVE-2026-91332](https://nvd.nist.gov/vuln/detail/CVE-2026-91332) | JDK 21 · Networking | 5.3 | 36 |
| [CVE-2026-91451](https://nvd.nist.gov/vuln/detail/CVE-2026-91451) | JDK 21 · Networking | 5.3 | 36 |
| [CVE-2026-91452](https://nvd.nist.gov/vuln/detail/CVE-2026-91452) | JDK 21 · Networking | 5.3 | 36 |
| [CVE-2026-83381](https://nvd.nist.gov/vuln/detail/CVE-2026-83381) | JDK 21 · Security | 4.8 | 35 |
| [CVE-2026-114945](https://nvd.nist.gov/vuln/detail/CVE-2026-114945) | JDK 21 · Libraries | 5.3 | 34 |
| [CVE-2026-91410](https://nvd.nist.gov/vuln/detail/CVE-2026-91410) | JDK 21 · Libraries | 5.3 | 32 |
| [CVE-2026-87292](https://nvd.nist.gov/vuln/detail/CVE-2026-87292) | JDK 21 · Networking | 3.7 | 32 |
| [CVE-2026-91333](https://nvd.nist.gov/vuln/detail/CVE-2026-91333) | JDK 21 · Security | 3.7 | 32 |
| [CVE-2026-91380](https://nvd.nist.gov/vuln/detail/CVE-2026-91380) | JDK 21 · Utility | 4.0 | 30 |

## Candidatas que traía la skill

| CVE | Componente | Resultado |
|---|---|---|
| CVE-2024-38827, CVE-2025-22223, CVE-2025-22228, CVE-2025-22234 | Spring Security | Ramas antiguas; OSV no devuelve avisos para 7.1.2 |
| CVE-2025-41249, CVE-2026-41841/2/3, CVE-2026-41851, CVE-2026-22741, CVE-2026-22745 | Spring Framework | Corregidas antes de 7.0.10 |
| CVE-2026-59280, CVE-2026-59281 | Spring Framework | OSV no las asocia a 7.0.10; la primera además exige FreeMarker |
| CVE-2026-41717, CVE-2026-41696 | Spring Data MongoDB | Corregidas antes de 5.1.2 |
| CVE-2026-22746 | Spring Security | Corregida en 7.0.5 |
| CVE-2026-41003, CVE-2026-40988 | Spring Security SAML | Módulo ausente |
| CVE-2026-41707, CVE-2026-47841, CVE-2026-47842 | Spring Security | OSV no las asocia a 7.1.2; no revisado el detalle |
| CVE-2026-88057, CVE-2026-52725, CVE-2026-32635 | Angular | Corregidas antes de 22.2.5 |
| CVE-2026-88060, CVE-2026-88056 | Angular SSR | No hay `platform-server`; además corregidas en 22.1.4 |

## Node.js
Las publicaciones del [21/10/2026](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) y del [11/11/2026](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases) afectan a Node 24 anterior a 24.22.3. Node solo compila: no está en la imagen final. El equipo usa 26.13.1, que la publicación lista como corregida.

## Limitaciones
- `openjdk.org` y `oracle.com` rechazaron la consulta automática (HTTP 403). Los datos de Java proceden de **NVD** (descripciones de Oracle) y de [Adoptium](https://adoptium.net/news/2026/11/temurin-november-2026-cspu-java4shell/).
- NVD lista las versiones «soportadas afectadas»; se supone que las anteriores también lo están. La versión corregida de cada CVE se ha deducido de esa lista: confirmadla con el aviso del fabricante.
- La búsqueda de Java cubre CVE publicadas en NVD desde el 01/10/2026; no actualizaciones anteriores.
- Los avisos de Spring consultados son los del 19/11/2026; no se pudo paginar a agosto–octubre.
- **No analizados:** paquetes del sistema operativo de las imágenes base (no había Trivy ni Grype), OWASP Dependency-Check, dependencias transitivas de Android, complementos de Maven.
- **MongoDB Server:** versión desconocida. Hay avisos de 2026 de gravedad alta ([boletines](https://www.mongodb.com/resources/products/mongodb-security-bulletins)); comprobad la versión en Atlas. `NO_VERIFICADA`.
- CISA KEV (catálogo 2026.11.25): ninguna de las CVE consultadas figura.
