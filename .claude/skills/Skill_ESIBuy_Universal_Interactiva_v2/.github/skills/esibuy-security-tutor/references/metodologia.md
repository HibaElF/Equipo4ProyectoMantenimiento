# Metodología reutilizable

## Árboles de ataque
- La raíz describe **un resultado adversario** (ej. «leer un recurso ajeno»), no «IDOR» como término vago.
- OR: basta una rama. AND: hacen falta todas las condiciones hijas. Las secuencias temporales se describen en flujos MU, no mediante AND automáticamente.
- Etiqueta fuentes: observado en repositorio vs supuesto del analista vs validado mediante prueba.
- Anota precondición, actor, activo, control, impacto, test y visibilidad en registros por hoja.

## Casos de mal uso
Una ficha narra un comportamiento abusivo contra un caso legítimo (actor adversario, precondiciones, interacción, consecuencia posible). Nunca trates un MU como evidencia de que la versión sea vulnerable.

## Casos de uso de seguridad
Especifica el comportamiento protector exigido por el sistema, incluyendo errores y efectos laterales; requisitos de seguridad atómicos, observables y testeables. Una medida preventiva (validación de titularidad) y una detectiva (alerta) pueden coexistir.

## Revisión de versión
Inspecciona estructura de proyecto en tiempo de consulta, no mantengas tablas con endpoints de versiones anteriores. Para diferencias usa dos árboles de fuentes concretas y describe lo añadido/eliminado/modificado.

## Pruebas
Separar propuestas, añadidas/compiladas y ejecutadas. Registrar nombre, fuente, comando, salida, resultado y entorno. La mera presencia de una prueba no demuestra que pase. Probar casos negativos y que no existen mutaciones tras rechazar.

## Formato de incertidumbre
`[OBSERVADO EN CÓDIGO]`, `[OBSERVADO EN DOCUMENTACIÓN]`, `[HIPÓTESIS]`, `[CONTROL PROPUESTO]`, `[PRUEBA AÑADIDA NO EJECUTADA]`, `[PRUEBA EJECUTADA]`, `[NO VERIFICADO]`.
