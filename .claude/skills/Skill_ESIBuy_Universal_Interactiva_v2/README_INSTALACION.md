# ESIBuy Security Tutor v2.0 — Instalación universal e interactiva

Este ZIP contiene una **skill sin código fuente** de ESIBuy, preparada para instalarse en `.agents/skills/esibuy-security-tutor/` o `.github/skills/esibuy-security-tutor/`. Ambas copias son idénticas y alternativas: instala la ruta compatible con tu asistente; no necesitas duplicarla.

## Instalación
1. Extrae el ZIP.
2. Copia la carpeta `esibuy-security-tutor` de la variante `.agents/skills/` o `.github/skills/` al repositorio ESIBuy que se vaya a analizar.
3. Abre o sube **la versión concreta del proyecto** y solicita: **«Ejecuta la skill esibuy-security-tutor»**.
4. El tutor identifica proyecto → pregunta técnicas → pregunta cantidades → genera y explica → ofrece revisión → pregunta si quieres informe final.

## Ejemplo de interacción
- Alumno: «Ejecuta esibuy-security-tutor con el proyecto que he subido».
- Tutor: detecta versión y pregunta qué técnicas generar.
- Alumno: «Todas».
- Tutor: «¿Cuántos árboles, casos de mal uso y casos de uso de seguridad quieres? Puedo empezar con 3 de cada».
- Alumno: «2, 4 y 3; cubre funcionalidades sensibles».
- Tutor: inspecciona las funcionalidades reales, genera casos y pregunta si desea revisar alguno.
- Alumno: «Ya están bien».
- Tutor: «¿Quieres que genere un informe final? (Sí/No)».
- Alumno: «Sí, Word».
- Tutor: prepara el informe si tiene herramientas disponibles.

## Otras consultas
«Revisa AT-02», «Explícame por qué esta rama es AND», «Añade dos casos de mal uso», «Relaciona SUC con pruebas», «Compara las versiones si tengo ambos repositorios».

## Límites
La skill no crea por sí misma un motor ejecutable: es un conjunto de instrucciones para un asistente compatible. Debe poder acceder al repositorio real, y para exportar Word/PDF necesita herramientas de generación de archivos. El análisis estático no equivale a ejecutar pruebas ni confirma explotabilidad.
