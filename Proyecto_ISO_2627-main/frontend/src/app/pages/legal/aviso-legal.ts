import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// T-24: página pública con el aviso legal. Su texto debe coincidir con documents/rgpd/aviso-legal.md.
@Component({
  imports: [RouterLink],
  selector: 'app-aviso-legal',
  styleUrl: './legal.css',
  templateUrl: './aviso-legal.html',
})
export class AvisoLegal {}
