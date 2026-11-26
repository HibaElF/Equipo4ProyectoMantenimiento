/**
 * APK para un móvil real conectado por USB (npm run android:dispositivo).
 * Con «adb reverse tcp:8443 tcp:8443» el puerto 8443 del móvil apunta al del ordenador,
 * así que no hace falta conocer la IP del ordenador ni estar en la misma wifi.
 * Va por HTTPS, igual que el emulador.
 */
export const environment = {
  apiUrl: 'https://localhost:8443'
};
