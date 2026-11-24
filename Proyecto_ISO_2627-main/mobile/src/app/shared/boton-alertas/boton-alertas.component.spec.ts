import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { AlertasEstadoService } from '../../core/services/alertas-estado.service';
import { BotonAlertasComponent } from './boton-alertas.component';

describe('BotonAlertasComponent', () => {
  function pintar(noLeidas: number) {
    TestBed.configureTestingModule({
      imports: [BotonAlertasComponent],
      providers: [provideRouter([]), provideIonicAngular({}), provideHttpClient()]
    });
    TestBed.inject(AlertasEstadoService).noLeidas.set(noLeidas);
    const fixture = TestBed.createComponent(BotonAlertasComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('sin alertas nuevas: solo la campana', () => {
    const el = pintar(0);
    expect(el.querySelector('a')?.getAttribute('aria-label')).toBe('Alertas');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/alertas');
    expect(el.querySelector('.contador')).toBeNull();
  });

  it('con alertas nuevas: número rojo y el lector de pantalla dice cuántas', () => {
    const el = pintar(3);
    expect(el.querySelector('a')?.getAttribute('aria-label')).toBe('Alertas, 3 sin leer');
    expect(el.querySelector('.contador')?.textContent?.trim()).toBe('3');
  });

  it('más de 9: «9+» en la campana, el número exacto para el lector', () => {
    const el = pintar(14);
    expect(el.querySelector('.contador')?.textContent?.trim()).toBe('9+');
    expect(el.querySelector('a')?.getAttribute('aria-label')).toBe('Alertas, 14 sin leer');
  });
});
