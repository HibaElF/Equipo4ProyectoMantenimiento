/** Mismo contrato que la web (GET/PATCH/DELETE /cliente/alertas). */
export type TipoAlerta = 'BAJADA_PRECIO' | 'DISPONIBILIDAD' | 'RECOMENDACION';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  productoId: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
}

export interface AlertasResponse {
  alertas: Alerta[];
  noLeidas: number;
}

const ETIQUETAS_TIPO: Record<TipoAlerta, string> = {
  BAJADA_PRECIO: 'Bajada de precio',
  DISPONIBILIDAD: 'Disponible de nuevo',
  RECOMENDACION: 'Recomendación'
};

export function etiquetaTipoAlerta(tipo: TipoAlerta): string {
  return ETIQUETAS_TIPO[tipo] ?? 'Aviso';
}

/** Texto del contador: a partir de 10 se muestra «9+». */
export function textoContador(total: number): string {
  return total > 9 ? '9+' : String(total);
}
