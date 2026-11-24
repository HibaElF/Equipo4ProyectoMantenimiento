import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { routes } from '../../app.routes';
import { AvisoLegal } from './aviso-legal';
import { PoliticaPrivacidad } from './politica-privacidad';

// T-24: las páginas legales son públicas (sin guardas) y enlazan entre sí.
describe('Páginas legales (T-24)', () => {
  it('las rutas existen y no llevan guarda de acceso', () => {
    for (const ruta of ['politica-privacidad', 'aviso-legal']) {
      const definicion = routes.find((r) => r.path === ruta);
      expect(definicion, ruta).toBeDefined();
      expect(definicion?.canActivate, ruta).toBeUndefined();
    }
  });

  it('muestra la política de privacidad con su versión y los destinatarios reales', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/politica-privacidad', PoliticaPrivacidad);

    const pagina: HTMLElement = harness.routeNativeElement!;
    expect(pagina.querySelector('h1')?.textContent).toContain('Política de privacidad');
    expect(pagina.querySelector('.version')?.textContent).toContain('Versión 1.0');
    for (const proveedor of ['MongoDB Atlas', 'Render', 'Brevo', 'VirusTotal']) {
      expect(pagina.textContent).toContain(proveedor);
    }
  });

  it('muestra el aviso legal y enlaza con la política de privacidad', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/aviso-legal', AvisoLegal);

    const pagina: HTMLElement = harness.routeNativeElement!;
    expect(pagina.querySelector('h1')?.textContent).toContain('Aviso legal');
    const enlaces = Array.from<HTMLAnchorElement>(pagina.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(enlaces).toContain('/politica-privacidad');
  });
});
