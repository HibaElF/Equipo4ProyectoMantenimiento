import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';
import { EstadoSegundoFactorService } from '../../core/services/estado-segundo-factor.service';
import { PerfilService } from '../../core/services/perfil.service';
import { AvisoSegundoFactorComponent } from './aviso-segundo-factor.component';

describe('AvisoSegundoFactorComponent', () => {
  const api = { consultar: vi.fn() };

  function crear() {
    TestBed.configureTestingModule({
      imports: [AvisoSegundoFactorComponent],
      providers: [provideRouter([]), provideIonicAngular({}), { provide: PerfilService, useValue: api }]
    });
    const fixture = TestBed.createComponent(AvisoSegundoFactorComponent);
    fixture.detectChanges();
    return { fixture, aviso: fixture.componentInstance, estado: TestBed.inject(EstadoSegundoFactorService) };
  }

  beforeEach(() => api.consultar.mockReset());
  afterEach(() => sessionStorage.clear());

  it('sale a los clientes sin segundo factor y se puede descartar', () => {
    api.consultar.mockReturnValue(of({ totpActivado: false }));
    const { fixture, aviso } = crear();
    expect(aviso.visible()).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Protege tu cuenta.');
    aviso.descartar();
    expect(aviso.visible()).toBe(false);
  });

  it('no sale si ya está activado o si no se puede consultar el perfil', () => {
    api.consultar.mockReturnValue(of({ totpActivado: true }));
    expect(crear().aviso.visible()).toBe(false);
    TestBed.resetTestingModule();
    api.consultar.mockReturnValue(throwError(() => new Error('401')));
    expect(crear().aviso.visible()).toBe(false);
  });

  it('si ya se conoce el estado no vuelve a consultar el perfil', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PerfilService, useValue: api }] });
    TestBed.inject(EstadoSegundoFactorService).activado.set(true);
    TestBed.createComponent(AvisoSegundoFactorComponent).detectChanges();
    expect(api.consultar).not.toHaveBeenCalled();
  });
});
