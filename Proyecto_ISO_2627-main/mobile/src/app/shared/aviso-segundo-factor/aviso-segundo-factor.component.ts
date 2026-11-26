import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { shieldHalfOutline } from 'ionicons/icons';
import { EstadoSegundoFactorService } from '../../core/services/estado-segundo-factor.service';
import { PerfilService } from '../../core/services/perfil.service';

/**
 * T-27: recordatorio, no bloqueante, para que el cliente active el segundo factor (igual que en la web).
 * Solo sale si no lo tiene activado y se puede descartar con «Ahora no».
 */
@Component({
  selector: 'app-aviso-segundo-factor',
  imports: [RouterLink, IonButton, IonIcon],
  templateUrl: './aviso-segundo-factor.component.html',
  styleUrl: './aviso-segundo-factor.component.css'
})
export class AvisoSegundoFactorComponent implements OnInit {
  private readonly perfilApi = inject(PerfilService);
  private readonly estado = inject(EstadoSegundoFactorService);

  readonly visible = computed(() => this.estado.activado() === false && !this.estado.descartado());

  constructor() {
    addIcons({ shieldHalfOutline });
  }

  ngOnInit(): void {
    if (this.estado.activado() !== null || this.estado.descartado()) return;
    this.perfilApi.consultar().subscribe({
      next: (perfil) => this.estado.activado.set(perfil.totpActivado),
      // Sin perfil (sesión caducada o error) no se muestra nada: el aviso nunca estorba.
      error: () => undefined
    });
  }

  descartar(): void {
    this.estado.descartar();
  }
}
