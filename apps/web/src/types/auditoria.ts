export type EntidadAuditada = "ITEM_CATALOGO" | "CLIENTE";
export type AccionAuditoria = "ALTA" | "MODIFICACION" | "ACTIVACION" | "DESACTIVACION";

export type CambioAuditado = {
  campo: string;
  antes: string | null;
  despues: string | null;
};

export type RegistroAuditoria = {
  idAuditoriaCambio: string;
  entidad: EntidadAuditada;
  idEntidad: string;
  accion: AccionAuditoria;
  cambios: CambioAuditado[];
  fecha: string;
  usuario: { idUsuario: string; nombre: string; apellido: string } | null;
};

export type ValorAuditado = { antes: string | null; despues: string | null };

// Un punto de la linea de tiempo de precio y costo de un item (solo administradores).
export type PuntoPrecio = {
  idAuditoriaCambio: string;
  fecha: string;
  accion: AccionAuditoria;
  usuario: { idUsuario: string; nombre: string; apellido: string } | null;
  precio: ValorAuditado | null;
  costo: ValorAuditado | null;
};
