# ESIBuy – mantenimiento de seguridad (Equipo 4)

Repositorio de la fase de mantenimiento de **ESIBuy**, una plataforma de comercio electrónico educativa (Spring Boot + Angular + MongoDB). El código del proyecto está en `Proyecto_ISO_2627-main/`; la raíz de Git es esta carpeta.

## Qué se está haciendo

Se implementan, por fases y de una en una, **23 tareas de seguridad** (T-xx) derivadas de una auditoría frente a una checklist de 19 requisitos (RQ-01 a RQ-19). Todo el material está en `requisitos-seguridad/`:

| Fichero | Para qué |
|---|---|
| `requisitos-seguridad/PLAN_IMPLEMENTACION.md` | Fases, tareas y cómo implementar cada una (léelo por secciones, con `Grep` a `### T-xx`) |
| `requisitos-seguridad/PROGRESO.md` | Estado de cada tarea y línea base. Se actualiza al cerrar cada tarea |
| `requisitos-seguridad/PROMPTS.md` | Prompts de inicio y de cada fase |
| `requisitos-seguridad/contexto/CONTEXTO_PROYECTO.md` | Arquitectura, seguridad existente, entorno y comandos (importado abajo) |
| `requisitos-seguridad/contexto/REGLAS_DE_TRABAJO.md` | Flujo, git, definición de «hecho» (importado abajo) |
| `Proyecto_ISO_2627-main/Agents.md` | Reglas del equipo para asistentes de IA (léelo) |

Skills del proyecto (`.claude/skills/`): `implementar-tarea-seguridad`, `pruebas-esibuy`, `cerrar-tarea-seguridad` y `comprobar-secretos`.

## Reglas que no se negocian

1. Una tarea cada vez: **propón un plan breve y espera el visto bueno** antes de editar; al terminar, resume lo cambiado y espera revisión.
2. **Sin `commit`, `push`, cambios de rama ni reescritura de historia** salvo petición expresa. Propón el mensaje de commit.
3. Solo las 23 tareas del plan. Las demás tareas de la auditoría las llevan otros miembros del equipo.
4. Nunca leas ni imprimas `backend/.env`, `.certs/` ni valores de secretos. Ningún secreto ni dato personal en código, logs ni pruebas.
5. Si no estás seguro al 80 %, pregunta; no inventes.
6. El código cambia entre auditoría y hoy: localiza por clase y método, no por número de línea.

## Si eres el chat de auditoría

Este fichero es para el chat de implementación. Si el usuario te dice que tu papel es **auditar**, no modifiques código: revisa, contrasta con la checklist y registra hallazgos en `auditoria/`.

@requisitos-seguridad/contexto/CONTEXTO_PROYECTO.md
@requisitos-seguridad/contexto/REGLAS_DE_TRABAJO.md
