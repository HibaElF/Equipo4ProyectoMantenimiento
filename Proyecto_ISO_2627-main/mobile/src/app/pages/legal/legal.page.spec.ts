import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { AvisoLegalPage } from './aviso-legal.page';
import { PoliticaPrivacidadPage } from './politica-privacidad.page';

describe('Páginas legales', () => {
  function texto<T>(pagina: new () => T): string {
    TestBed.configureTestingModule({ imports: [pagina], providers: [provideRouter([]), provideIonicAngular({})] });
    const fixture = TestBed.createComponent(pagina);
    fixture.detectChanges();
    return fixture.nativeElement.textContent as string;
  }

  it('política de privacidad con su versión, igual que la web', () => {
    const contenido = texto(PoliticaPrivacidadPage);
    expect(contenido).toContain('Versión 1.0');
    expect(contenido).toContain('Plazos de conservación');
  });

  it('aviso legal enlazado con la política', () => {
    expect(texto(AvisoLegalPage)).toContain('Protección de datos');
  });
});
