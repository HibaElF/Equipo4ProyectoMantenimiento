# 03 · Fichas de las CVE del Top 25

Las 24 fichas de Java comparten la misma incógnita (qué parche de Java ejecuta el despliegue) y la misma solución. El aviso de cada una describe el fallo; aquí no se atribuyen mecanismos que la fuente no detalle.

## Cinco casos para profundizar

1. **Java4Shell (CVE-2026-114938).** Corrupción de memoria en el decodificador Base64 de HotSpot con CPU AVX-512 VBMI. En ESIBuy la entrada sin autenticación existe: `XorCsrfTokenRequestAttributeHandler` (Spring Security 7.1.2) llama a `Base64.getUrlDecoder().decode` con la cabecera `X-XSRF-TOKEN`. Detalle en H-14 de `../resultado-auditoria.md`.
2. **CVE-2026-114820 y CVE-2026-91403 (JSSE, 9.1).** Afectan a la capa TLS. ESIBuy usa TLS contra Brevo, VirusTotal y MongoDB. CVE-2026-91403 incluye la 21.0.13 de octubre en las afectadas: **no basta con la actualización de octubre**.
3. **Imágenes (2D e ImageIO: CVE-2026-91415, 91418, 91334).** La recodificación añadida en T-33 hace que archivos de vendedores pasen por estas bibliotecas. Requiere estar autenticado como vendedor.
4. **Tomcat (CVE-2026-118233).** Único del ranking con versión confirmada en el componente. El fabricante lo califica de severidad baja; la puntuación 7.5 es de NVD.
5. **Libraries y Compiler (CVE-2026-114941, 114942).** Los avisos no concretan la API afectada, así que no se puede descartar ni confirmar su alcance.

## Fichas

### 1. CVE-2026-114938 · JDK 21 · Compiler

- **Impacto según el vector:** confidencialidad alto, integridad alto, disponibilidad alto. CVSS 3.1: 8.1 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.3. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Versión afectada + CPU x86-64 con AVX-512 VBMI + datos del atacante en el decodificador Base64.
- **Uso en ESIBuy:** Entrada sin autenticar: la cabecera CSRF se decodifica en Base64. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/config/SecurityConfiguration.java:195; Dockerfile:31`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 93 = impacto 25 + exposición 24 + explotabilidad 18 + sensibilidad 15 + confianza 11. EPSS: 0.59265 · CISA KEV: no.
- **Prueba segura:** P-1 y P-3 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114938

### 2. CVE-2026-114820 · JDK 21 · JSSE

- **Impacto según el vector:** confidencialidad alto, integridad alto, disponibilidad ninguno. CVSS 3.1: 9.1 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.2. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** TLS: conexiones salientes a Brevo, VirusTotal y MongoDB; TLS entrante en local. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; application.properties (spring.mongodb.uri)`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 64 = impacto 18 + exposición 16 + explotabilidad 8 + sensibilidad 15 + confianza 7. EPSS: 0.00265 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114820

### 3. CVE-2026-91403 · JDK 21 · JSSE

- **Impacto según el vector:** confidencialidad alto, integridad alto, disponibilidad ninguno. CVSS 3.1: 9.1 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** TLS: conexiones salientes a Brevo, VirusTotal y MongoDB; TLS entrante en local. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; application.properties (spring.mongodb.uri)`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 64 = impacto 18 + exposición 16 + explotabilidad 8 + sensibilidad 15 + confianza 7. EPSS: 0.00265 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91403

### 4. CVE-2026-114940 · JDK 21 · JSSE

- **Impacto según el vector:** confidencialidad alto, integridad alto, disponibilidad ninguno. CVSS 3.1: 7.4 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.3. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** TLS: conexiones salientes a Brevo, VirusTotal y MongoDB; TLS entrante en local. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; application.properties (spring.mongodb.uri)`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 60 = impacto 18 + exposición 16 + explotabilidad 4 + sensibilidad 15 + confianza 7. EPSS: 0.0031 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114940

### 5. CVE-2026-118233 · Apache Tomcat embebido

- **Impacto según el vector:** confidencialidad ninguno, integridad ninguno, disponibilidad alto. CVSS 3.1: 7.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`).
- **Versión:** 11.0.27 (resuelta). 11.0.0-M1 a 11.0.27. **Corregida en:** 11.0.29.
- **Condiciones:** «En algunas circunstancias» durante el cambio de protocolo HTTP; el aviso no las detalla.
- **Uso en ESIBuy:** Servidor HTTP expuesto; incluye tomcat-embed-websocket. Ruta: `backend/pom.xml (gestionada por spring-boot-starter-parent 4.1.2)`.
- **Clasificación:** `CONFIRMADA_EN_COMPONENTE`. No se ha demostrado explotación.
- **Score local:** 53 = impacto 9 + exposición 18 + explotabilidad 8 + sensibilidad 6 + confianza 12. EPSS: 0.0046 · CISA KEV: no.
- **Prueba segura:** P-2 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://tomcat.apache.org/security-11.html

### 6. CVE-2026-91415 · JDK 21 · 2D

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad alto. CVSS 3.1: 7.0 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:H`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Se redibujan imágenes subidas por vendedores. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:250`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 50 = impacto 15 + exposición 16 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00306 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91415

### 7. CVE-2026-114941 · JDK 21 · Compiler

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad alto. CVSS 3.1: 7.0 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:H`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.3. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** JIT activo en cualquier ejecución. Ruta: `Dockerfile:31`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 46 = impacto 15 + exposición 12 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00215 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114941

### 8. CVE-2026-91398 · JDK 21 · Networking

- **Impacto según el vector:** confidencialidad ninguno, integridad alto, disponibilidad ninguno. CVSS 3.1: 6.8 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:C/C:N/I:H/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Clientes HTTP salientes (RestClient). Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; VirusTotalService.java:25`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 45 = impacto 9 + exposición 10 + explotabilidad 4 + sensibilidad 15 + confianza 7. EPSS: 0.00285 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91398

### 9. CVE-2026-83374 · JDK 21 · Security

- **Impacto según el vector:** confidencialidad ninguno, integridad alto, disponibilidad ninguno. CVSS 3.1: 5.9 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Criptografía y certificados. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/TotpCryptoService.java; DatosPersonalesCryptoService.java`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 45 = impacto 9 + exposición 10 + explotabilidad 4 + sensibilidad 15 + confianza 7. EPSS: 0.00301 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-83374

### 10. CVE-2026-91394 · JDK 21 · Networking

- **Impacto según el vector:** confidencialidad alto, integridad ninguno, disponibilidad ninguno. CVSS 3.1: 5.9 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Clientes HTTP salientes (RestClient). Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; VirusTotalService.java:25`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 45 = impacto 9 + exposición 10 + explotabilidad 4 + sensibilidad 15 + confianza 7. EPSS: 0.00332 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91394

### 11. CVE-2026-114943 · JDK 21 · Hotspot

- **Impacto según el vector:** confidencialidad ninguno, integridad bajo, disponibilidad alto. CVSS 3.1: 6.5 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:H`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.3. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Máquina virtual de cualquier ejecución. Ruta: `Dockerfile:31`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 43 = impacto 12 + exposición 12 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00239 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114943

### 12. CVE-2026-114944 · JDK 21 · Core Java Libraries

- **Impacto según el vector:** confidencialidad ninguno, integridad alto, disponibilidad ninguno. CVSS 3.1: 5.9 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:H/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.3. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Bibliotecas base; el aviso no concreta la API. Ruta: `toda la aplicación`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 43 = impacto 9 + exposición 8 + explotabilidad 4 + sensibilidad 15 + confianza 7. EPSS: 0.00215 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114944

### 13. CVE-2026-114942 · JDK 21 · Libraries

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad alto. CVSS 3.1: 7.0 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:H`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.3. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Bibliotecas base; el aviso no concreta la API. Ruta: `toda la aplicación`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 42 = impacto 15 + exposición 8 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00215 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114942

### 14. CVE-2026-91373 · JDK 21 · JSSE

- **Impacto según el vector:** confidencialidad ninguno, integridad ninguno, disponibilidad bajo. CVSS 3.1: 5.3 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** TLS: conexiones salientes a Brevo, VirusTotal y MongoDB; TLS entrante en local. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; application.properties (spring.mongodb.uri)`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 40 = impacto 3 + exposición 16 + explotabilidad 8 + sensibilidad 6 + confianza 7. EPSS: 0.00402 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91373

### 15. CVE-2026-91418 · JDK 21 · ImageIO

- **Impacto según el vector:** confidencialidad ninguno, integridad ninguno, disponibilidad bajo. CVSS 3.1: 5.3 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Se decodifican imágenes subidas por vendedores. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:199`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 40 = impacto 3 + exposición 16 + explotabilidad 8 + sensibilidad 6 + confianza 7. EPSS: 0.00402 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91418

### 16. CVE-2026-83395 · JDK 21 · Networking

- **Impacto según el vector:** confidencialidad ninguno, integridad bajo, disponibilidad bajo. CVSS 3.1: 6.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Clientes HTTP salientes (RestClient). Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; VirusTotalService.java:25`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 39 = impacto 6 + exposición 10 + explotabilidad 8 + sensibilidad 8 + confianza 7. EPSS: 0.00332 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-83395

### 17. CVE-2026-87294 · JDK 21 · Security

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad ninguno. CVSS 3.1: 6.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Criptografía y certificados. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/TotpCryptoService.java; DatosPersonalesCryptoService.java`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 39 = impacto 6 + exposición 10 + explotabilidad 8 + sensibilidad 8 + confianza 7. EPSS: 0.00266 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-87294

### 18. CVE-2026-91375 · JDK 21 · Libraries

- **Impacto según el vector:** confidencialidad ninguno, integridad alto, disponibilidad ninguno. CVSS 3.1: 4.7 (`CVSS:3.1/AV:L/AC:H/PR:N/UI:R/S:U/C:N/I:H/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Bibliotecas base; el aviso no concreta la API. Ruta: `toda la aplicación`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 39 = impacto 9 + exposición 8 + explotabilidad 0 + sensibilidad 15 + confianza 7. EPSS: 0.0012 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91375

### 19. CVE-2026-83376 · JDK 21 · JSSE

- **Impacto según el vector:** confidencialidad ninguno, integridad bajo, disponibilidad ninguno. CVSS 3.1: 3.7 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** TLS: conexiones salientes a Brevo, VirusTotal y MongoDB; TLS entrante en local. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; application.properties (spring.mongodb.uri)`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 38 = impacto 3 + exposición 16 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00256 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-83376

### 20. CVE-2026-91334 · JDK 21 · ImageIO

- **Impacto según el vector:** confidencialidad bajo, integridad ninguno, disponibilidad ninguno. CVSS 3.1: 3.7 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Se decodifican imágenes subidas por vendedores. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/ProductoImagenService.java:199`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 38 = impacto 3 + exposición 16 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00269 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91334

### 21. CVE-2026-91461 · JDK 21 · JSSE

- **Impacto según el vector:** confidencialidad ninguno, integridad bajo, disponibilidad ninguno. CVSS 3.1: 3.7 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:L/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** TLS: conexiones salientes a Brevo, VirusTotal y MongoDB; TLS entrante en local. Ruta: `backend/src/main/java/es/uclm/esibuy/backend/services/BrevoEmailService.java:40; application.properties (spring.mongodb.uri)`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 38 = impacto 3 + exposición 16 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00242 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91461

### 22. CVE-2026-101516 · JDK 21 · Libraries

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad ninguno. CVSS 3.1: 6.5 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** Bibliotecas base; el aviso no concreta la API. Ruta: `toda la aplicación`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 37 = impacto 6 + exposición 8 + explotabilidad 8 + sensibilidad 8 + confianza 7. EPSS: 0.00266 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-101516

### 23. CVE-2026-114946 · JDK 21 · Compiler

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad ninguno. CVSS 3.1: 4.8 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.13.0.3. **Corregida en:** 21.0.13.1 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** JIT activo en cualquier ejecución. Ruta: `Dockerfile:31`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 37 = impacto 6 + exposición 12 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00214 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-114946

### 24. CVE-2026-83378 · JDK 21 · Compiler

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad ninguno. CVSS 3.1: 4.8 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** JIT activo en cualquier ejecución. Ruta: `Dockerfile:31`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 37 = impacto 6 + exposición 12 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00217 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-83378

### 25. CVE-2026-91487 · JDK 21 · Compiler

- **Impacto según el vector:** confidencialidad bajo, integridad bajo, disponibilidad ninguno. CVSS 3.1: 4.8 (`CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N`).
- **Versión:** 21 (parche desconocido en despliegue). NVD lista afectada 21.0.12.1. **Corregida en:** 21.0.13 o posterior.
- **Condiciones:** Que el despliegue ejecute una versión de Java 21 afectada.
- **Uso en ESIBuy:** JIT activo en cualquier ejecución. Ruta: `Dockerfile:31`.
- **Clasificación:** `NO_VERIFICADA`. No se ha demostrado explotación.
- **Score local:** 37 = impacto 6 + exposición 12 + explotabilidad 4 + sensibilidad 8 + confianza 7. EPSS: 0.00217 · CISA KEV: no.
- **Prueba segura:** P-1 (ver `04-pruebas-seguras.md`). **Regresión:** suite completa de backend tras actualizar.
- **Fuente (2026-11-26):** https://nvd.nist.gov/vuln/detail/CVE-2026-91487
