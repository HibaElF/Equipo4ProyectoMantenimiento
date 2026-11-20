# Reglas de trabajo del chat de implementación

> Estas reglas combinan las de `Proyecto_ISO_2627-main/Agents.md` (reglas del equipo) con las de este trabajo. Si el usuario te da una instrucción distinta en el chat, prevalece la del usuario, pero no se aplica a otras tareas salvo que lo diga.

## 1. Flujo por tarea

1. **Una fase y una tarea cada vez**, en el orden del plan (`PLAN_IMPLEMENTACION.md`).
2. **Verifica el punto de partida** en el código real (el plan se escribió sobre un commit anterior).
3. **Propón un plan breve** (qué ficheros, qué cambios, qué pruebas, qué preguntas) y **espera el visto bueno** del usuario antes de editar. Esta regla viene de `Agents.md` («Antes de una tarea no trivial, propón un plan y espera mi OK»).
4. Implementa lo mínimo que cumpla los criterios de aceptación de la tarea. **No amplíes el alcance**: si ves algo más que arreglar, anótalo en `PROGRESO.md` (sección de notas) y sigue.
5. Escribe o actualiza las pruebas (skill `pruebas-esibuy`) y ejecútalas.
6. Cierra con la skill `cerrar-tarea-seguridad`: comprobaciones, actualización de `PROGRESO.md` y resumen para el usuario.
7. **Espera la revisión del usuario** antes de empezar la tarea siguiente («Una tarea a la vez; al terminar, dime qué cambiaste para que lo revise»).

## 2. Cuándo parar y preguntar

Pregunta, sin implementar, si:

- no estás seguro al 80 % de lo que hay que hacer («Si no estás seguro al 80 %, pregunta. No inventes»);
- el plan marca «Preguntar al usuario» (decisiones de negocio o datos que no están en el repositorio);
- el código real contradice el plan o la tarea ya parece hecha;
- el cambio obliga a tocar muchas pruebas existentes, cambiar contratos de API o una dependencia nueva;
- vas a modificar un fichero de la tabla de coordinación del plan (§2) y `git log origin/Develop -- <fichero>` muestra trabajo reciente de otros;
- necesitas un secreto, una acción en Atlas, Sonar, Render, GitHub o Azure (las hace el usuario).

## 3. Git

- **No hagas `commit`, `push`, `merge`, `rebase`, `reset` ni cambios de rama** salvo que el usuario lo pida expresamente en ese momento.
- Cuando una tarea esté lista, **propón** el mensaje de commit: `T-XX: <resumen en español>` con un cuerpo breve (qué y por qué). Un commit por tarea. Si el usuario te pide hacer el commit, añade al final las líneas de atribución que indique el entorno.
- No incluyas en un commit ficheros que no sean de la tarea (`git status` antes de proponer). No versiones `target/`, `node_modules/`, `.env`, `.certs/`, `uploads/` ni logs.
- Nunca fuerces un push ni reescribas la historia sin una orden explícita.

## 3 bis. Alcance

- Solo las **23 tareas del plan**. Las demás (T-01 a T-04, T-14 a T-17, T-28, T-29, T-31, T-32, T-36 y T-37) las llevan otros miembros: no las implementes aunque parezcan pequeñas. Si una de las nuestras depende de una de ellas, dilo.
- No refactorices, no cambies el formato de ficheros enteros, no renombres ni muevas clases que no sean necesarias para la tarea.
- Antes de editar ficheros compartidos, sigue la tabla de coordinación del plan.

## 4. Reglas de código de seguridad

- **Sin datos personales en logs, errores ni auditoría:** nada de contraseñas, códigos, tokens ni correos en claro; usa el identificador seudonimizado (T-18) cuando exista.
- **Mantén las respuestas uniformes** del registro, la recuperación y el login (anti-enumeración).
- **Validación en el servidor** con Bean Validation; el frontend valida por comodidad, no por seguridad.
- **Consultas tipadas:** nada de construir filtros de MongoDB con texto del usuario ni `$where`.
- **El propietario del recurso sale de la sesión**, nunca de la petición.
- **Secretos** solo por variables de entorno, nunca en el código, en `application.properties` ni en pruebas. Las claves de prueba son claramente falsas.
- **Fallar de forma segura:** si falta una clave obligatoria, la aplicación no arranca (como ya hacen `TotpCryptoService` y `PepperedBCryptPasswordEncoder`).
- **Criptografía:** usa las primitivas ya presentes (HMAC-SHA256, AES-GCM, SHA-256, `SecureRandom`); no inventes esquemas nuevos.
- **Comparaciones de secretos en tiempo constante** (`MessageDigest.isEqual`).

## 5. Definición de «hecho» de una tarea

- [ ] Cumple todos los criterios de aceptación de la tarea (lístalos uno a uno en el resumen).
- [ ] Pruebas nuevas o actualizadas, y **todas** las del módulo afectado en verde; al cerrar la fase, la suite completa.
- [ ] La cobertura de JaCoCo no baja del 60 % (ni de la línea base de forma notable).
- [ ] Sin secretos ni datos personales en el diff (skill `comprobar-secretos`).
- [ ] Frontend: `.spec.ts` actualizados y, si Node lo permite, ejecutados.
- [ ] Documentación actualizada cuando cambia la configuración o el despliegue (`docs/CI-CD-Render.md`, variables nuevas).
- [ ] `PROGRESO.md` actualizado.
- [ ] Resumen entregado al usuario con los pasos manuales para comprobarlo.

## 6. Formato del resumen al terminar una tarea

1. **Qué has cambiado** (ficheros y una frase por fichero).
2. **Criterios de aceptación:** lista con ✔ o ✘ y la evidencia (prueba o comprobación).
3. **Pruebas ejecutadas** y resultado (números).
4. **Cómo lo compruebo yo** (pasos manuales, si los hay).
5. **Variables o configuración nuevas** que hay que desplegar.
6. **Riesgos, decisiones tomadas y cosas anotadas fuera de alcance.**
7. **Mensaje de commit propuesto.**

## 7. Comandos largos y entorno

- La suite completa del backend y las compilaciones largas se lanzan **en segundo plano** y no se consultan en bucle: el sistema avisa al terminar.
- Para buscar usa las herramientas de búsqueda (`Grep`, `Glob`) y no `grep`/`find` por la terminal.
- Nunca leas `backend/.env`, `.certs/` ni keystores.
- Si falta una herramienta (Node, Docker), dilo y continúa con lo que sí se pueda verificar.
