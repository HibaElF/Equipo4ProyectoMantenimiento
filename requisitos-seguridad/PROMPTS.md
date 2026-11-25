# Prompts para el chat de implementación

> Cómo usarlos: abre Claude Code **en la carpeta raíz del repositorio** (`Equipo4ProyectoMantenimiento/`, donde está `CLAUDE.md`) para que cargue las instrucciones y las skills. Pega el prompt en un bloque de texto tal cual; sustituye lo que está entre `{llaves}`.

## Orden de uso

1. **Prompt 1** una sola vez, al abrir el chat por primera vez (Fase 0: lectura y línea base, sin tocar código).
2. **Prompt 2** al empezar cada fase (1 a 8).
3. **Prompt 3** si quieres una tarea concreta fuera de orden.
4. **Prompt 4** cuando el chat se llene o abras uno nuevo.
5. **Prompt 5** al terminar cada fase.
6. **Prompt 6** si aparece un conflicto con el trabajo de otros miembros.
7. **Prompt 7** va en el chat de **auditoría** (el que ya tienes), no en el de implementación.

## Prompt 1 – Arranque y Fase 0

```text
Vas a ayudarme a implementar, por fases y una tarea cada vez, 22 tareas de seguridad en el proyecto ESIBuy (Spring Boot + Angular + MongoDB), derivadas de una auditoría. Este chat es solo de implementación; la auditoría la llevo en otro chat.

Antes de nada, lee en este orden:
1. CLAUDE.md (se carga solo) y los ficheros que importa.
2. Proyecto_ISO_2627-main/Agents.md (reglas del equipo).
3. requisitos-seguridad/PLAN_IMPLEMENTACION.md: lee las secciones 0 a 3 y la Fase 0. El resto lo leerás tarea por tarea.
4. requisitos-seguridad/PROGRESO.md.

Después ejecuta únicamente la Fase 0, sin modificar ningún fichero de código:
- comprueba la rama actual, las versiones de Java, Node y Docker, y dime si Node es suficiente para las pruebas del frontend;
- mide la línea base de pruebas y cobertura del backend (en segundo plano) y, si Node lo permite, la del frontend;
- revisa qué ha cambiado en el proyecto desde el commit 9a8f5a7 y dime si algo del plan queda desfasado;
- rellena la sección «Línea base» de requisitos-seguridad/PROGRESO.md.

No imprimas ni copies nunca el valor de un secreto.

Cuando termines, dame un resumen corto con la línea base y las dudas que tengas, y espera mi visto bueno antes de empezar la Fase 1. No hagas commit, push ni cambies de rama.
```

## Prompt 2 – Empezar una fase

```text
Empezamos la Fase {N} ({nombre de la fase}) de requisitos-seguridad/PLAN_IMPLEMENTACION.md. Las tareas de la fase, en este orden, son: {T-xx, T-xx, T-xx}.

Usa la skill implementar-tarea-seguridad y ve tarea a tarea:
1. Lee el bloque de la primera tarea y comprueba en el código real que el punto de partida sigue siendo cierto.
2. Si la tarea marca «Preguntar al usuario», hazme esas preguntas antes de proponer el plan.
3. Propón un plan breve y espera mi visto bueno antes de editar nada.
4. Implementa con pruebas, ciérrala con la skill cerrar-tarea-seguridad y espera mi revisión antes de pasar a la siguiente.

Recuerda: sin commit ni push, sin ampliar el alcance, sin leer ni imprimir secretos, y respetando la tabla de coordinación con las tareas de otros miembros. Empieza por {T-xx}.
```

## Prompt 3 – Una tarea concreta

```text
Quiero que implementes la tarea {T-xx} ({título}) del plan. Usa la skill implementar-tarea-seguridad: comprueba sus dependencias en PROGRESO.md, verifica el punto de partida en el código real, hazme las preguntas pendientes y propón un plan breve. No edites nada hasta que te dé el visto bueno.
```

## Prompt 4 – Retomar en un chat nuevo

```text
Retomamos la implementación de las tareas de seguridad de ESIBuy en un chat nuevo. Lee CLAUDE.md, Proyecto_ISO_2627-main/Agents.md y requisitos-seguridad/PROGRESO.md, y haz esto sin modificar nada:
1. Resume en pocas líneas qué tareas están hechas, cuál está en curso y cuál toca ahora.
2. Ejecuta git status y git log -5 --oneline, y dime si hay cambios sin commitear que correspondan a la tarea en curso o ficheros que no reconozcas.
3. Revisa las secciones «Decisiones tomadas con el usuario» y «Pendientes manuales del usuario» de PROGRESO.md y recuérdame lo que queda abierto.
Después, propón cómo continuar con la tarea {T-xx} y espera mi visto bueno.
```

## Prompt 5 – Cerrar una fase

```text
Hemos terminado las tareas de la Fase {N}. Haz el cierre de fase sin modificar código:
1. Ejecuta la suite completa del backend (en segundo plano) y, si Node lo permite, la del frontend; compara con la línea base de PROGRESO.md.
2. Aplica la skill comprobar-secretos sobre todo lo cambiado en la fase.
3. Revisa que PROGRESO.md refleja el estado real de cada tarea de la fase y completa la fila de la fase en «Notas para el chat de auditoría» con los requisitos (RQ) afectados.
4. Dame: resultados con números, lista de variables o configuración nuevas que hay que desplegar, acciones manuales pendientes y un mensaje de commit (o varios, uno por tarea) propuesto.
No hagas commit ni push; espera mi orden.
```

## Prompt 6 – Conflicto con el trabajo de otros

```text
Para. Antes de seguir con {T-xx}, comprueba si el fichero {ruta} ha cambiado en origin/Develop o en otras ramas remotas (git fetch y git log origin/Develop -- {ruta}; son comandos de solo lectura). Cuéntame qué ha cambiado, a qué tarea de otro miembro corresponde (consulta la tabla de coordinación del plan) y propón cómo evitar el conflicto: orden de trabajo, cambios más pequeños o hablar con esa persona. No modifiques nada hasta que decidamos.
```

## Prompt 7 – Para el chat de auditoría (este no es el de implementación)

```text
Vamos a re-auditar la Fase {N} del plan de implementación. Esta sesión es solo de auditoría: no modifiques código.
1. Lee requisitos-seguridad/PROGRESO.md y el bloque de cada tarea de la fase en requisitos-seguridad/PLAN_IMPLEMENTACION.md (criterios de aceptación).
2. Para cada tarea, revisa el código actual (git diff desde el commit de partida de la fase) y comprueba uno a uno los criterios de aceptación y los requisitos RQ afectados, con ruta:líneas y fragmento literal como evidencia.
3. Marca cada criterio como Cumple, Parcial o No cumple. Si algo no se puede comprobar desde el código, indica qué evidencia manual falta.
4. Señala regresiones de seguridad, secretos o datos personales en el diff, y cualquier cosa fuera de alcance.
5. Actualiza el estado de los requisitos afectados y guarda el resultado en auditoria/ (por ejemplo auditoria/reauditoria_fase_{N}.md). Al final, resume los totales y los 3 problemas más graves.
```
