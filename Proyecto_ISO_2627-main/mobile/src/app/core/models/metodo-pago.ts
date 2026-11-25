export interface TipoPago {
  codigo: string;
  nombre: string;
}

export interface MetodoPagoRequest {
  tipo: string;
  nombre: string;
  numeroTarjeta?: string | null;
  titular?: string | null;
  caducidad?: string | null;
  cvv?: string | null;
  correoPaypal?: string | null;
  telefonoBizum?: string | null;
}

export interface MetodoPago {
  id: string;
  tipo: string;
  nombre: string;
  datosEnmascarados: string;
  titular?: string | null;
  caducidad?: string | null;
}
