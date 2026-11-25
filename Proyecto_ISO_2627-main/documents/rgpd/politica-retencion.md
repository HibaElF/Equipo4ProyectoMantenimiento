# Política de retención de datos

**Versión 1.0** · Última actualización: [COMPLETAR: fecha]

> PLANTILLA. Los plazos técnicos están verificados contra el código; los marcados `[COMPLETAR: …]` requieren decisión del responsable.

| Dato | Plazo | Mecanismo |
|---|---|---|
| Cuenta de cliente y datos asociados (listas, métodos de pago, carrito) | Hasta la baja de la cuenta | Baja desde el perfil (`BajaUsuarioService`); se impide la baja con pedidos en curso |
| Cuenta de vendedor y sus productos | Hasta la baja de la cuenta | Baja desde el perfil; se eliminan también sus productos y sus imágenes |
| Pedidos ya cerrados | [COMPLETAR: plazo legal y tratamiento tras la baja] | [COMPLETAR] |
| Registro de auditoría de seguridad | **365 días** | Índice de caducidad de MongoDB (`app.auditoria.retencion`, por defecto 365 días); solo se añaden eventos, no se modifican |
| Registros de la aplicación (logs del servidor) | [COMPLETAR: según la política de Render] | Gestionado por el proveedor de alojamiento |
| Enlaces de recuperación de contraseña y de verificación del correo | Minutos u horas (caducidad del enlace) | Se guarda solo su hash; índice de caducidad de MongoDB y consumo de un solo uso |
| Contadores de intentos de acceso y límites de uso | Ventanas de minutos a horas | Índice de caducidad de MongoDB |
| Sesión | 30 minutos de inactividad y 8 horas como máximo | Configuración de la sesión |
| Copias de seguridad | [COMPLETAR: política de copias de MongoDB Atlas] | Gestionado por el proveedor |

## Revisión

La política se revisa [COMPLETAR: periodicidad] y siempre que cambie el tratamiento. Los cambios sustanciales se reflejan en la política de privacidad y en el registro de actividades.
