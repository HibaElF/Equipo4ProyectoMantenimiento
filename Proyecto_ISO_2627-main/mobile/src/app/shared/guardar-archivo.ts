import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Entrega al usuario un archivo generado en la app (T-25, «Descargar mis datos»).
 * - En Android no hay descargas como en el navegador: se guarda en la caché de la app y se abre el menú
 *   «Compartir», desde el que se puede guardar en Archivos o Drive, o enviar por correo.
 * - En el navegador (ng serve) se descarga como en la web.
 * Devuelve false si el usuario cierra el menú sin elegir nada.
 */
export async function guardarArchivo(contenido: Blob, nombre: string, titulo: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    const direccion = URL.createObjectURL(contenido);
    const enlace = document.createElement('a');
    enlace.href = direccion;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(direccion);
    return true;
  }

  const { uri } = await Filesystem.writeFile({
    path: nombre,
    data: await contenido.text(),
    directory: Directory.Cache,
    encoding: Encoding.UTF8
  });
  try {
    await Share.share({ title: titulo, files: [uri], dialogTitle: titulo });
    return true;
  } catch (e) {
    // Cerrar el menú sin compartir no es un error.
    if (String((e as Error)?.message ?? e).toLowerCase().includes('cancel')) return false;
    throw e;
  }
}
