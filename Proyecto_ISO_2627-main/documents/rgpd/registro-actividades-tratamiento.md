# Registro de actividades de tratamiento (art. 30 RGPD)

**Versión 1.0** · Última actualización: [COMPLETAR: fecha]

> PLANTILLA. Los datos marcados como `[COMPLETAR: …]` los debe aportar el responsable. Las columnas técnicas (datos, destinatarios, medidas, plazos) están verificadas contra el código del proyecto.

- Responsable: [COMPLETAR: nombre, NIF, domicilio]
- Contacto / DPD: [COMPLETAR]

| Actividad | Fines | Interesados | Datos | Base jurídica | Destinatarios | Plazo de conservación |
|---|---|---|---|---|---|---|
| Gestión de cuentas de clientes | Alta, autenticación y gestión de la cuenta | Clientes | Nombre, apellidos, correo, fecha de nacimiento, DNI/NIF (cifrado), teléfono (cifrado), imagen de perfil, hash de contraseña, versión y fecha de aceptación de la política | Contrato [COMPLETAR: confirmar] | MongoDB Atlas, Render, Brevo (correos) | Mientras la cuenta esté activa; se suprimen al darse de baja |
| Gestión de cuentas de vendedores | Alta, autenticación y publicación de productos | Vendedores | Nombre, apellidos, correo, DNI/NIF (cifrado), teléfono (cifrado), nombre comercial, categoría, hash de contraseña, versión y fecha de aceptación de la política | Contrato [COMPLETAR: confirmar] | MongoDB Atlas, Render, Brevo, VirusTotal (imágenes, si se activa) | Mientras la cuenta esté activa; se suprimen con sus productos al darse de baja |
| Compras y pedidos | Carrito, pedidos, direcciones y métodos de pago (simulados) | Clientes | Direcciones, métodos de pago simulados, pedidos, valoraciones, favoritos y listas | Contrato | MongoDB Atlas, Render | [COMPLETAR: plazo legal de conservación de pedidos] |
| Seguridad y auditoría | Detección de abusos, trazabilidad de eventos de seguridad | Todos los usuarios | Eventos de seguridad con identificador seudonimizado, IP, navegador, identificador de correlación | Interés legítimo [COMPLETAR: ponderación] | MongoDB Atlas, Render | 365 días (índice de caducidad automática) |
| Comunicaciones de servicio | Verificación del correo, recuperación de contraseña, avisos de bloqueo | Todos los usuarios | Correo y contenido del mensaje | Contrato / interés legítimo | Brevo | No se conserva el contenido en el sistema; los enlaces caducan |

## Medidas de seguridad (art. 32)

Hash de contraseñas con *pepper*; cifrado de DNI/NIF y teléfono y de los secretos del segundo factor; segundo factor obligatorio para vendedores y administradores; límites de intentos y de peticiones; sesiones con caducidad; protección CSRF; Content-Security-Policy; recodificación y análisis de las imágenes subidas; registros de seguridad con identificadores seudonimizados; gestión de secretos por variables de entorno.
