import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';
import { EstrellasComponent } from './estrellas.component';

describe('EstrellasComponent', () => {
  function crear(valor: number) {
    TestBed.configureTestingModule({ imports: [EstrellasComponent], providers: [provideIonicAngular({})] });
    const fixture = TestBed.createComponent(EstrellasComponent);
    fixture.componentRef.setInput('valor', valor);
    fixture.detectChanges();
    return fixture;
  }

  it('redondea a medias estrellas', () => {
    expect(crear(3.7).componentInstance.iconos()).toEqual(['star', 'star', 'star', 'star-half', 'star-outline']);
  });

  it('limita el valor entre 0 y 5', () => {
    expect(crear(7).componentInstance.iconos()).toEqual(Array(5).fill('star'));
    TestBed.resetTestingModule();
    expect(crear(-1).componentInstance.iconos()).toEqual(Array(5).fill('star-outline'));
  });

  it('el lector de pantalla lee la nota en español', () => {
    const el = crear(4.25).nativeElement as HTMLElement;
    expect(el.querySelector('[role=img]')?.getAttribute('aria-label')).toBe('4,3 de 5');
  });
});
