---
name: implementar-tarea-seguridad
description: Implementa UNA tarea de seguridad (T-xx) del plan de ESIBuy con el flujo del equipo - leer el plan, verificar el código real, proponer un plan breve, esperar el visto bueno, implementar con pruebas y cerrar. Úsala cuando el usuario diga "implementa T-xx", "siguiente tarea", "empieza la fase N" o similar.
---

# Implementar una tarea de seguridad

Aplica este procedimiento a **una sola tarea**. Si el usuario pide una fase entera, hazla tarea a tarea, en el orden del plan, y espera su revisión entre una y otra.

## 1. Localizar la tarea y comprobar que procede

1. Busca el bloque de la tarea en `requisitos-seguridad/PLAN_IMPLEMENTACION.md` con `Grep` (patrón `### T-XX`) y léelo entero, incluidos los criterios de aceptación.
2. Lee `requisitos-seguridad/PROGRESO.md`:
   - la tarea no debe estar ya `Hecha` ni `En curso` por otra sesión;
   - sus **dependencias** (campo del plan) deben estar `Hechas`; si no, dilo y propón el orden correcto;
   - la **línea base** de la Fase 0 debe estar medida; si no, para y propón ejecutar la Fase 0.
3. Comprueba que la tarea es de las **23 aceptadas**. Si piden una de las de otros miembros (T-01 a T-04, T-14 a T-17, T-28, T-29, T-31, T-32, T-36, T-37), avisa y no la implementes.

## 2. Verificar el punto de partida en el código real

El plan se escribió sobre el commit `9a8f5a7` y el código ha cambiado. Antes de proponer nada:

- localiza las clases y métodos citados con `Grep` y `Read` (no con números de línea);
- confirma que el problema sigue existiendo y cómo está ahora el código;
- si la tarea ya está resuelta o el código ha cambiado de forma que el diseño del plan no encaja, **para y cuéntaselo al usuario**;
- si vas a tocar un fichero de la tabla de coordinación del plan (§2), ejecuta `git fetch` y revisa `git log origin/Develop -- <fichero>` por si otro miembro lo está cambiando. Es de solo lectura.

## 3. Proponer el plan y esperar el visto bueno

Presenta, en pocas líneas:

1. qué ficheros vas a crear o modificar y qué harás en cada uno;
2. qué pruebas añadirás o actualizarás;
3. las **decisiones pendientes** del plan («Preguntar al usuario») con tu recomendación;
4. riesgos y posibles conflictos con tareas de otros.

**No edites ningún fichero hasta que el usuario conteste.** Marca la tarea como `En curso` en `PROGRESO.md` solo después de su visto bueno.

## 4. Implementar

- Haz el cambio **mínimo** que cumpla los criterios de aceptación; no refactorices ni reformatees ficheros enteros.
- Imita el estilo del código vecino (español, `record` para DTO, manejadores de excepciones por área, indentación del fichero).
- Primero la lógica de servicio y su prueba, luego el controlador y su prueba, y al final el frontend con su `.spec.ts`.
- Aplica las reglas de seguridad de `REGLAS_DE_TRABAJO.md` §4 (sin datos personales en logs, respuestas uniformes, secretos por entorno…).
- Escribe las pruebas siguiendo la skill `pruebas-esibuy` y ejecútalas tras cada bloque de cambios (pruebas dirigidas; la suite completa solo al cerrar).
- Si el cambio obliga a modificar muchas pruebas existentes, cambia una firma de constructor o añade una dependencia, **para y consulta** antes de seguir.
- Cualquier otra mejora que veas: anótala en `PROGRESO.md` (notas), no la hagas.

## 5. Cerrar

Cuando los criterios de aceptación estén cubiertos, invoca la skill **`cerrar-tarea-seguridad`**. Después **espera la revisión del usuario** antes de empezar otra tarea.
