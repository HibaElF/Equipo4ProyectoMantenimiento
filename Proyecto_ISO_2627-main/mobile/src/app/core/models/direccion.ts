export interface DireccionRequest {
  nombre: string;
  calle: string;
  numero: string;
  portal?: string | null;
  piso?: string | null;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
}

export interface Direccion extends DireccionRequest {
  id: string;
}

/** «Calle Mayor, 3, 2º B · Ciudad Real (13001)». */
export function textoDireccion(d: Direccion): string {
  const extra = [d.portal ? `portal ${d.portal}` : '', d.piso ?? ''].filter(Boolean).join(', ');
  return `${d.calle}, ${d.numero}${extra ? ', ' + extra : ''} · ${d.ciudad} (${d.codigoPostal})`;
}
