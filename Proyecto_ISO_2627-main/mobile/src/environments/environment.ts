/**
 * APK para el emulador de Android Studio (npm run android:emulador): 10.0.2.2 es el «localhost»
 * del ordenador visto desde el emulador. Va por HTTPS con el certificado de desarrollo que crea
 * scripts/configurar-https.ps1 (incluye 10.0.2.2) y que la app solo acepta en las versiones debug.
 */
export const environment = {
  apiUrl: 'https://10.0.2.2:8443'
};
