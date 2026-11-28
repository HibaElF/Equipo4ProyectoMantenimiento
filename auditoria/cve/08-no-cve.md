# 08 · Debilidades sin CVE

No tienen identificador CVE. Detalle y evidencia en [`../resultado-auditoria.md`](../resultado-auditoria.md), sección 5.

| Ref. | Severidad | Debilidad | Propuesta |
|---|---|---|---|
| H-01 | Alta | Premium sin pago desde `PUT /usuarios/perfil` | Separar la modificación propia de la del administrador |
| H-02 | Media | Límite de registro eludible con la ruta codificada | Comparar la ruta decodificada |
| H-03 | Media | Firma de imágenes eludible de la misma forma | Igual |
| H-04 | Media | Token de Sonar versionado y enviado por HTTP | Variable secreta y revocación |
| H-05 | Media | App móvil por HTTP | HTTPS y quitar `cleartext` |
| H-06 | Media | Registro móvil roto | Enviar CSRF y consentimiento |
| H-07 | Baja | Rutas de estadísticas sin declarar en el servidor | Añadirlas |
| H-08 | Baja | CodeQL no se ejecuta | Mover el workflow a la raíz |
| H-09 | Media | Rotación de credenciales de MongoDB pendiente | Rotar |
| H-10 a H-13 | Baja | Límites en memoria, reutilización del *pepper*, textos legales, código sin uso | Ver informe |
| Nueva | Media | Imágenes Docker con etiquetas flotantes, sin *digest* | Fijar versión y *digest* |
