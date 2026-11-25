import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// T-24: página pública con la política de privacidad. Su texto debe coincidir con
// documents/rgpd/politica-privacidad.md; al cambiarlo de forma sustancial se sube la versión.
@Component({
  imports: [RouterLink],
  selector: 'app-politica-privacidad',
  styleUrl: './legal.css',
  templateUrl: './politica-privacidad.html',
})
export class PoliticaPrivacidad {
  readonly version = '1.0';
}
