import { Routes } from '@angular/router';
import { clienteGuard } from './core/auth/cliente.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.page').then((m) => m.RegistroPage)
  },
  {
    // Misma ruta que la web, para que el enlace del correo también funcione aquí.
    path: 'recuperar-contrasena',
    loadComponent: () =>
      import('./pages/recuperar-contrasena/recuperar-contrasena.page').then((m) => m.RecuperarContrasenaPage)
  },
  {
    // Zona del cliente con las pestañas inferiores. Solo para clientes con sesión.
    path: '',
    canActivate: [clienteGuard],
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tienda' },
      {
        path: 'tienda',
        loadComponent: () => import('./pages/tienda/tienda.page').then((m) => m.TiendaPage)
      },
      {
        // La ficha se abre dentro de la pestaña Tienda.
        path: 'tienda/producto/:id',
        loadComponent: () => import('./pages/producto/producto.page').then((m) => m.ProductoPage)
      },
      {
        path: 'favoritos',
        loadComponent: () => import('./pages/favoritos/favoritos.page').then((m) => m.FavoritosPage)
      },
      {
        path: 'carrito',
        loadComponent: () => import('./pages/carrito/carrito.page').then((m) => m.CarritoPage)
      },
      {
        path: 'carrito/checkout',
        loadComponent: () => import('./pages/checkout/checkout.page').then((m) => m.CheckoutPage)
      },
      {
        path: 'pedidos',
        loadComponent: () => import('./pages/pedidos/pedidos.page').then((m) => m.PedidosPage)
      },
      {
        path: 'pedidos/:id',
        loadComponent: () => import('./pages/pedido/pedido.page').then((m) => m.PedidoPage)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./pages/perfil/perfil.page').then((m) => m.PerfilPage)
      },
      {
        path: 'perfil/direcciones',
        loadComponent: () => import('./pages/direcciones/direcciones.page').then((m) => m.DireccionesPage)
      },
      {
        path: 'perfil/metodos-pago',
        loadComponent: () => import('./pages/metodos-pago/metodos-pago.page').then((m) => m.MetodosPagoPage)
      }
    ]
  },
  { path: '**', redirectTo: 'tienda' }
];
