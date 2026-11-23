import { TestBed } from '@angular/core/testing';
import { AvatarPerfilComponent } from './avatar-perfil.component';

describe('AvatarPerfilComponent', () => {
  function pintar(imagen: string | null, nombre: string) {
    TestBed.configureTestingModule({ imports: [AvatarPerfilComponent] });
    const fixture = TestBed.createComponent(AvatarPerfilComponent);
    fixture.componentRef.setInput('imagen', imagen);
    fixture.componentRef.setInput('nombre', nombre);
    fixture.detectChanges();
    return fixture;
  }

  it('sin foto muestra la inicial', () => {
    const el = pintar(null, 'ana').nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.inicial')?.textContent?.trim()).toBe('A');
  });

  it('con foto la muestra y, si no carga, vuelve a la inicial', () => {
    const fixture = pintar('https://x.es/a.jpg', 'Luis');
    const el = fixture.nativeElement as HTMLElement;
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://x.es/a.jpg');
    expect(img.getAttribute('alt')).toBe('');
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.inicial')?.textContent?.trim()).toBe('L');
  });

  it('sin nombre muestra un signo de interrogación', () => {
    expect((pintar(null, '').nativeElement as HTMLElement).querySelector('.inicial')?.textContent?.trim()).toBe('?');
  });
});
