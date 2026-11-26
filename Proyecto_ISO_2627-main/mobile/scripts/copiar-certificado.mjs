// Copia el certificado HTTPS de desarrollo (creado por scripts/configurar-https.ps1) al proyecto Android,
// para que las versiones debug de la app confíen en el backend local. Es un certificado público:
// la clave privada nunca sale de .certs. La copia no se sube a Git (.gitignore).
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const movil = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const origen = resolve(movil, '..', '.certs', 'localhost.pem');
const destino = resolve(movil, 'android', 'app', 'src', 'main', 'res', 'raw', 'esibuy_localhost.pem');

if (!existsSync(origen)) {
  console.error(
    'No existe .certs/localhost.pem. Prepara primero HTTPS con:\n' +
      '  powershell -ExecutionPolicy Bypass -File ..\\scripts\\configurar-https.ps1'
  );
  process.exit(1);
}

mkdirSync(dirname(destino), { recursive: true });
copyFileSync(origen, destino);
console.log('Certificado HTTPS de desarrollo copiado a la app (res/raw/esibuy_localhost.pem).');
