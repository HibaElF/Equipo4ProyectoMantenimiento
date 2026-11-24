# Política de privacidad de ESIBuy

**Versión 1.0** · Última actualización: [COMPLETAR: fecha de publicación]

> PLANTILLA. Los datos marcados como `[COMPLETAR: …]` no constan en el repositorio y los debe aportar el responsable. Este texto debe ser revisado por el equipo (y, si procede, por un asesor jurídico) antes de publicarse. Al cambiar el texto de forma sustancial hay que subir la versión (`PoliticaPrivacidad.VERSION_ACTUAL` en el backend y el texto de las páginas del frontend).

## 1. Responsable del tratamiento

- Responsable: [COMPLETAR: nombre o razón social]
- Identificación fiscal: [COMPLETAR: NIF/CIF]
- Domicilio: [COMPLETAR: dirección]
- Contacto para cuestiones de privacidad: [COMPLETAR: correo de contacto]
- Delegado de protección de datos (si procede): [COMPLETAR]

## 2. Datos que tratamos

| Categoría | Datos | Cuándo se recogen |
|---|---|---|
| Identificación y contacto | Nombre, apellidos, correo electrónico, teléfono (opcional), imagen de perfil (opcional, URL) | Registro y perfil |
| Identificadores | DNI/NIF (se guarda cifrado) y fecha de nacimiento (solo clientes) | Registro |
| Cuenta y seguridad | Contraseña (solo se guarda un hash), estado de la cuenta, factores de autenticación, versión y fecha de aceptación de esta política | Registro y uso |
| Datos de actividad | Carrito, favoritos y listas, direcciones, métodos de pago (simulados), pedidos y valoraciones | Uso del servicio |
| Vendedores | Nombre comercial y categoría | Registro |
| Registros de seguridad | Eventos de seguridad (inicios de sesión, cambios de cuenta, bloqueos), con identificadores seudonimizados, dirección IP, navegador y un identificador de correlación | Uso del servicio |

No se utilizan cookies de publicidad ni de análisis. Solo se usan cookies técnicas imprescindibles: la sesión (`JSESSIONID`) y la protección frente a CSRF (`XSRF-TOKEN`).

## 3. Finalidades y base jurídica

| Finalidad | Base jurídica |
|---|---|
| Crear y gestionar la cuenta y prestar el servicio de compraventa | Ejecución del contrato (art. 6.1.b RGPD) [COMPLETAR: confirmar] |
| Seguridad de la cuenta y del sistema (autenticación, prevención de abusos, auditoría) | Interés legítimo (art. 6.1.f RGPD) [COMPLETAR: confirmar y documentar la ponderación] |
| Envío de correos de servicio (verificación del correo, recuperación de contraseña, avisos de seguridad) | Ejecución del contrato y interés legítimo [COMPLETAR: confirmar] |
| Aceptación de esta política en el registro | Consentimiento informado y expreso (art. 6.1.a RGPD), en el sentido de dejar constancia de que se ha leído |
| Obligaciones legales (por ejemplo, contables o fiscales) | Obligación legal (art. 6.1.c RGPD) [COMPLETAR: si procede] |

## 4. Destinatarios y encargados del tratamiento

Los datos no se venden ni se ceden con fines comerciales. Para prestar el servicio intervienen estos proveedores:

| Proveedor | Para qué | Datos |
|---|---|---|
| MongoDB Atlas | Base de datos del servicio | Todos los datos de las cuentas y de la actividad |
| Render | Alojamiento de la aplicación | Datos que circulan por la aplicación y registros del servidor |
| Brevo | Envío de correo transaccional | Correo del destinatario y contenido del mensaje |
| VirusTotal (solo si está activado) | Análisis antivirus de las imágenes de producto subidas por los vendedores | La imagen subida |

[COMPLETAR: ubicación de los proveedores, transferencias internacionales y garantías aplicables (por ejemplo, cláusulas contractuales tipo)]

## 5. Plazos de conservación

Resumen; el detalle está en la política de retención.

- Datos de la cuenta: mientras la cuenta esté activa. Al darse de baja se eliminan la cuenta y los datos asociados indicados en la política de retención.
- Registros de seguridad (auditoría): 365 días.
- Enlaces de recuperación de contraseña y de verificación del correo: caducan y se eliminan automáticamente.
- Sesiones: 30 minutos de inactividad y 8 horas como máximo.
- Pedidos y datos contables: [COMPLETAR: plazo legal y tratamiento tras la baja].

## 6. Derechos

Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad escribiendo a [COMPLETAR: correo de contacto]. Puedes darte de baja desde tu perfil, lo que suprime tu cuenta. Si consideras que tus derechos no se han atendido, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

## 7. Seguridad

Aplicamos medidas técnicas y organizativas proporcionales: contraseñas con hash y *pepper*, cifrado de DNI/NIF y teléfono, segundo factor de autenticación para vendedores y administradores, límites de intentos, registros de seguridad y cabeceras de seguridad en la web.

## 8. Cambios en esta política

Si cambia de forma sustancial, se publicará una nueva versión con su fecha. La versión aceptada por cada usuario al registrarse queda registrada junto con la fecha de aceptación.
