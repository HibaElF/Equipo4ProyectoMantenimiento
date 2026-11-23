import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideIonicAngular({})]
    }).compileComponents();
  });

  it('crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('App: foco al navegar', () => {
  it('quita el foco del botón pulsado al cambiar de pantalla (evita el aviso de aria-hidden)', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([{ path: 'otra', children: [] }]), provideIonicAngular({})]
    });
    TestBed.createComponent(App);
    const boton = document.createElement('button');
    document.body.appendChild(boton);
    boton.focus();
    expect(document.activeElement).toBe(boton);
    await TestBed.inject(Router).navigateByUrl('/otra');
    expect(document.activeElement).not.toBe(boton);
    boton.remove();
  });
});
