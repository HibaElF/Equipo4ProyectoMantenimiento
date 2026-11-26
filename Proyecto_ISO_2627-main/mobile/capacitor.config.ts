import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.uclm.esibuy',
  appName: 'ESIBuy',
  webDir: 'dist/mobile/browser',
  // Todo va por HTTPS (app y backend): ni tráfico en claro ni contenido mixto.
  // El certificado de desarrollo se acepta en android/app/src/main/res/xml/network_security_config.xml.
  plugins: {
    // Las peticiones salen desde Android (no desde el navegador): sin CORS y con la cookie de sesión guardada.
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true }
  }
};

export default config;
