---
name: cerrar-tarea-seguridad
description: Cierra una tarea de seguridad (T-xx) de ESIBuy - ejecuta las comprobaciones de la definición de hecho, revisa secretos, actualiza PROGRESO.md y entrega al usuario un resumen con criterios de aceptación, pruebas, pasos manuales y mensaje de commit propuesto. Úsala al terminar la implementación de una tarea o cuando el usuario pida "cierra la tarea".
---

# Cerrar una tarea de seguridad

Ejecuta estos pasos **en orden**. No marques la tarea como `Hecha` si alguno falla: explica qué falla y qué propones.

## 1. Comprobar el trabajo

1. **Criterios de aceptación:** vuelve al bloque de la tarea en `requisitos-seguridad/PLAN_IMPLEMENTACION.md`. Para cada casilla, anota ✔ o ✘ con su evidencia (prueba concreta o comprobación). Si alguno queda ✘, la tarea no está hecha.
2. **Pruebas:**
   - las pruebas dirigidas de lo que has tocado, en verde (skill `pruebas-esibuy`);
   - el módulo afectado completo en verde;
   - al cerrar la **última tarea de una fase**, la suite completa del backend (`./mvnw -B clean verify -Dtest='!BackendApplicationTests' -Dsurefire.failIfNoSpecifiedTests=false`, en segundo plano) y, si Node lo permite, la del frontend. Compara con la línea base de `PROGRESO.md`: no debe haber fallos nuevos ni bajar la cobertura de forma notable (mínimo del 60 %).
3. **Secretos y datos personales:** invoca la skill `comprobar-secretos` sobre lo que has cambiado.
4. **Alcance:** `git status` y `git diff --stat`. Solo deben aparecer ficheros de la tarea (más sus pruebas y documentación). Si hay otros, explícalos o revierte lo que sobre **con permiso del usuario**.
5. **Configuración y despliegue:** si has añadido propiedades o variables de entorno, ya deben estar documentadas en `docs/CI-CD-Render.md` y listadas para el usuario.
6. **Coordinación:** si has tocado un fichero de la tabla de coordinación del plan, repite `git fetch` y `git log origin/Develop -- <fichero>` y avisa de posibles conflictos.

## 2. Actualizar `PROGRESO.md`

- Fila de la tarea: estado `Hecha` (o `Bloqueada` con el motivo), rama o commit si existe y fecha.
- «Decisiones tomadas con el usuario»: añade las que se hayan acordado.
- «Pendientes manuales del usuario»: añade las acciones nuevas (Atlas, Render, Sonar, variables…).
- «Notas para el chat de auditoría»: indica qué requisitos (RQ) quedan afectados por esta tarea y qué conviene volver a auditar.
- Si es la última tarea de la fase, rellena una fila de fase con la suite completa.

## 3. Entregar el resumen al usuario

Usa exactamente esta estructura (de `REGLAS_DE_TRABAJO.md` §6):

1. **Qué has cambiado** (ficheros y una frase por fichero).
2. **Criterios de aceptación** con ✔/✘ y evidencia.
3. **Pruebas ejecutadas** y números (y lo que no se ha podido ejecutar).
4. **Cómo lo compruebo yo** (pasos manuales concretos).
5. **Variables o configuración nuevas** que desplegar.
6. **Riesgos, decisiones y notas fuera de alcance.**
7. **Mensaje de commit propuesto:** `T-XX: <resumen en español>` con un cuerpo breve.

## 4. Después

- **No hagas commit ni push** salvo que el usuario lo pida ahora. Si lo pide, añade al mensaje las líneas de atribución que indique el entorno y haz **un commit por tarea** con solo sus ficheros.
- Pregunta qué hace falta antes de pasar a la tarea siguiente y **espera la revisión**.
