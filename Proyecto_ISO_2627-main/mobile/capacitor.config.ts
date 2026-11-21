import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'es.uclm.esibuy',
  appName: 'ESIBuy',
  webDir: 'dist/mobile/browser',
  server: { cleartext: true },
  plugins: {
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true }
  }
};

export default config;