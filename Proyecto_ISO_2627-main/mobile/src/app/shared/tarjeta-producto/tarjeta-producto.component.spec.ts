import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular';
import { ProductoCatalogo } from '../../core/models/producto';
import { TarjetaProductoComponent } from './tarjeta-producto.component';

const producto = (cambios: Partial<ProductoCatalogo> = {}): ProductoCatalogo => ({
  id: 'p1', nombre: 'Auriculares', categoria: 'Electrónica', stock: 5, precio: 40, precioOriginal: 50, descuento: 20,
  descuentoPremium: 0, descuentoAplicado: 20, descripcion: null, imagen: null, vendedor: 'Tienda', esVisible: true,
  soloPremium: false, ...cambios
});

describe('TarjetaProductoComponent (pantalla)', () => {
  let fixture: ComponentFixture<TarjetaProductoComponent>;

  function pintar(p: ProductoCatalogo, esFavorito = false) {
    TestBed.configureTestingModule({
      imports: [TarjetaProductoComponent],
      providers: [provideIonicAngular({}), provideHttpClient()]
    });
    fixture = TestBed.createComponent(TarjetaProductoComponent);
    fixture.componentRef.setInput('producto', p);
    fixture.componentRef.setInput('esFavorito', esFavorito);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra nombre, precio, rebaja y textos para el lector de pantalla', () => {
    const el = pintar(producto());
    expect(el.querySelector('.nombre')?.textContent).toContain('Auriculares');
    expect(el.querySelector('.oferta')?.textContent).toContain('-20%');
    expect(el.querySelector('.precio-anterior')?.textContent).toContain('Antes:');
    expect(el.querySelector('.zona-principal')?.getAttribute('aria-label')).toBe('Ver Auriculares');
    const corazon = el.querySelector('.boton-favorito')!;
    expect(corazon.getAttribute('aria-pressed')).toBe('false');
    expect(corazon.getAttribute('aria-label')).toBe('Guardar Auriculares en favoritos');
  });

  it('favorito marcado: el botón lo dice', () => {
    const corazon = pintar(producto(), true).querySelector('.boton-favorito')!;
    expect(corazon.getAttribute('aria-pressed')).toBe('true');
    expect(corazon.getAttribute('aria-label')).toBe('Quitar Auriculares de favoritos');
  });

  it('producto solo Premium bloqueado: no se abre ni se puede añadir', () => {
    const el = pintar(producto({ soloPremium: true }));
    const zona = el.querySelector<HTMLButtonElement>('.zona-principal')!;
    expect(zona.disabled).toBe(true);
    expect(zona.getAttribute('aria-label')).toBe('Auriculares, solo para clientes Premium');
    expect(el.querySelector('.capa-bloqueo')).not.toBeNull();
    let abierto = false;
    fixture.componentInstance.abrir.subscribe(() => (abierto = true));
    fixture.componentInstance.pulsarTarjeta();
    expect(abierto).toBe(false);
    expect(fixture.componentInstance.puedeAnadir()).toBe(false);
  });

  it('agotado y sin precio', () => {
    const el = pintar(producto({ stock: 0, precio: null }));
    expect(el.querySelector('.estado-agotado')).not.toBeNull();
    expect(el.querySelector('.sin-precio')?.textContent).toContain('Precio no disponible');
    expect(fixture.componentInstance.puedeAnadir()).toBe(false);
  });

  it('emite las acciones sin abrir la tarjeta a la vez', () => {
    pintar(producto());
    const c = fixture.componentInstance;
    const eventos: string[] = [];
    c.abrir.subscribe(() => eventos.push('abrir'));
    c.alternarFavorito.subscribe(() => eventos.push('favorito'));
    c.anadirAlCarrito.subscribe(() => eventos.push('carrito'));
    const evento = new Event('click');
    const parar = vi.spyOn(evento, 'stopPropagation');
    c.pulsarFavorito(evento);
    c.pulsarCarrito(evento);
    c.pulsarTarjeta();
    expect(eventos).toEqual(['favorito', 'carrito', 'abrir']);
    expect(parar).toHaveBeenCalledTimes(2);
  });

  it('si la imagen no carga muestra el icono de sin imagen', () => {
    const el = pintar(producto({ imagen: 'foto.jpg' }));
    expect(el.querySelector('img')).not.toBeNull();
    fixture.componentInstance.marcarImagenFallida();
    fixture.detectChanges();
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.sin-imagen')).not.toBeNull();
  });
});
