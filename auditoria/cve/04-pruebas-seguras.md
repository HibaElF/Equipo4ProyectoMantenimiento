# 04 · Pruebas seguras

Ninguna prueba explota un fallo. No se ha usado ninguna prueba de concepto.

| Id | Prueba | Comando o acción | Resultado en esta auditoría |
|---|---|---|---|
| P-1 | Versión real de Java | `java -version` dentro del contenedor desplegado; o `docker run --rm eclipse-temurin:21-jre java -version` tras `docker pull` | Despliegue: **no ejecutada**. Equipo: 23 |
| P-2 | Componentes resueltos | `./mvnw dependency:tree` | Ejecutada: Tomcat 11.0.27, Spring Security 7.1.2, Data MongoDB 5.1.2 |
| P-3 | CPU del despliegue | `lscpu` o `grep avx512 /proc/cpuinfo` en el contenedor (flags `avx512f avx512bw avx512vbmi bmi2`) | Despliegue: **no ejecutada**. Equipo: sin AVX-512 |
| P-4 | Ruta Base64 con entrada externa | `javap -c` sobre `XorCsrfTokenRequestAttributeHandler` | Ejecutada: llama a `Base64.getUrlDecoder().decode` |
| P-5 | Condiciones de Spring y Tomcat | Búsqueda en código de `$where`, `$function`, WebAuthn, RSocket, `IpAddressMatcher`, `ELRequestMatcher`, `RewriteValve`, `ExpiresFilter`, HTTP/2 | Ejecutada: sin usos |
| P-6 | Dependencias npm | `npm audit --json` en `frontend/` y `mobile/` | Ejecutada: 0 |
| P-7 | Base OSV | consulta por lotes de 838 paquetes (control: log4j 2.14.1 devuelve 8 avisos) | Ejecutada: 0 |

En PowerShell, la variable para la mitigación temporal en local es:

```powershell
$env:JAVA_TOOL_OPTIONS = "-XX:-UseBASE64Intrinsics"
```
