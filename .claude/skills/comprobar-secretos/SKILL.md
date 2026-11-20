---
name: comprobar-secretos
description: Revisa los cambios de ESIBuy en busca de secretos (tokens, claves, contraseñas, cadenas de conexión) y de datos personales en logs o pruebas, sin imprimir nunca los valores. Úsala antes de cerrar cualquier tarea, antes de proponer un commit y siempre que se toquen ficheros de configuración, pipelines o logs.
---

# Comprobar secretos y datos personales

El proyecto ya tuvo una fuga: un token de Sonar (`sonar.token=squ_…`) quedó versionado en `backend/sonar-project.properties` y `frontend/sonar-project.properties`. El objetivo de esta skill es que no vuelva a pasar con los cambios nuevos.

## Regla de oro

**Nunca imprimas, copies ni resumas el valor de un secreto**, ni en el chat, ni en ficheros, ni en mensajes de commit. Si encuentras uno, indica solo el fichero, el número de línea y el tipo, y enmascara el valor (`squ_ab12…`).

## 1. Qué buscar en lo que has cambiado

Revisa el diff de trabajo (`git diff` y `git diff --staged`, y los ficheros nuevos de `git status`) con estos patrones, **mostrando solo fichero y línea**:

- tokens: `squ_[0-9a-f]{8,}`, `sonar\.token`, `ghp_`, `github_pat_`, `AKIA[0-9A-Z]{12,}`, `xox[baprs]-`;
- claves y cabeceras: `BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY`, `api[_-]?key\s*[=:]\s*\S{12,}`, `Authorization:`;
- cadenas de conexión con credenciales: `mongodb(\+srv)?://[^$\s]*:[^@\s]+@`;
- contraseñas literales: `(password|contrasena|secret|token)\s*[=:]\s*["'][^"'$]{8,}`;
- ficheros que no deben versionarse: `.env`, `*.p12`, `*.pfx`, `*.pem`, `*.key`, `.certs/`, `.scannerwork/`, `*.log`, `debugsonar.txt`, `uploads/`.

Ejemplo de comando que muestra solo las coincidencias enmascaradas:

```bash
git diff HEAD -U0 | grep -nE "squ_[0-9a-f]{8,}|sonar\.token|mongodb(\+srv)?://[^$ ]+:[^@ ]+@|BEGIN (RSA |EC )?PRIVATE KEY" | sed -E 's/(squ_[0-9a-f]{4})[0-9a-f]+/\1…[ENMASCARADO]/g' | cut -c1-120
```

Las propiedades que referencian variables de entorno (`${NOMBRE}` o `${NOMBRE:}`) **no** son un secreto. Los valores de prueba claramente falsos en `src/test` tampoco, pero revísalos: no pueden parecer reales.

## 2. Datos personales en el código nuevo

En lo que has añadido:

- ningún `LOGGER.*`, mensaje de excepción ni evento de auditoría incluye correo, contraseña, código, token, DNI o teléfono en claro (usa el identificador seudonimizado cuando exista);
- los `toString()` de DTO con credenciales siguen ocultando los valores (patrón de `LoginRequest`);
- las respuestas de error no revelan si un correo existe;
- las pruebas no incluyen datos reales de personas.

## 3. Gitleaks (si hay Docker)

Para una comprobación más completa, desde la raíz del repositorio:

```bash
docker run --rm -v "${PWD}:/repo" ghcr.io/gitleaks/gitleaks:v8.24.3 detect --source /repo --redact
```

Si Docker no está disponible, dilo y quédate con la revisión por patrones.

## 4. Resultado

- **Sin hallazgos:** dilo en una línea («Secretos: sin hallazgos en el diff»).
- **Con hallazgos:** **para**, no propongas commit, informa al usuario del fichero y la línea, y recomienda: quitar el valor del fichero, usar una variable de entorno, **revocar o rotar el secreto** si llegó a publicarse y, solo con su permiso, valorar la limpieza del historial. No intentes arreglar el historial por tu cuenta.
