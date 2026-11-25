import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.uclm.esibuy',
  appName: 'ESIBuy',
  webDir: 'dist/mobile/browser',
  server: { cleartext: true },
  android: {
    /*
     * La app se sirve como https://localhost y el backend de desarrollo va por http://:
     * sin esto Android bloquearía las imágenes de los productos (contenido mixto).
     * Con un backend HTTPS no haría falta.
     */
    allowMixedContent: true
  },
  plugins: {
    // Las peticiones salen desde Android (no desde el navegador): sin CORS y con la cookie de sesión guardada.
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true }
  }
};

export default config;
