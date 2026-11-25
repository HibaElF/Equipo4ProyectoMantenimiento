import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PerfilService } from '../../pages/perfil/perfil.service';
import { avisoDescartado, descartarAviso } from './descarte-aviso';
import { EstadoSegundoFactor } from './estado-segundo-factor';

// T-27: recordatorio, no bloqueante, para que los clientes activen el segundo factor (en vendedores y
// administradores ya es obligatorio). Solo se muestra a clientes sin TOTP y se puede descartar.
@Component({
  imports: [RouterLink],
  selector: 'app-aviso-segundo-factor',
  styleUrl: './aviso-segundo-factor.css',
  templateUrl: './aviso-segundo-factor.html',
})
export class AvisoSegundoFactor {
  private readonly servicioPerfil = inject(PerfilService);
  private readonly estado = inject(EstadoSegundoFactor);

  private readonly esCliente = signal(false);
  private readonly descartado = signal(avisoDescartado());

  readonly visible = computed(
    () => this.esCliente() && this.estado.activado() === false && !this.descartado()
  );

  constructor() {
    this.servicioPerfil.consultarPerfil().subscribe({
      next: (perfil) => {
        this.esCliente.set(perfil.tipoUsuario === 'CLIENTE');
        this.estado.activado.set(perfil.totpActivado);
      },
      // Sin perfil (sesión caducada o error) no se muestra nada: el aviso nunca estorba.
      error: () => this.esCliente.set(false)
    });
  }

  descartar(): void {
    descartarAviso();
    this.descartado.set(true);
  }
}
