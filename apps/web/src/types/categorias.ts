export type Categoria = {
  idCategoria: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  activo: boolean;
  fechaAlta: string;
  fechaModificacion: string;
};

export type CategoriaPayload = {
  nombre: string;
  slug: string;
  descripcion?: string;
  activo?: boolean;
};
