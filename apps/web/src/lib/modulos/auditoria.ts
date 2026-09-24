import { apiFetch, buildQuery } from "../api";
import { formatearMoneda } from "../formato";
import { CambioAuditado, EntidadAuditada, RegistroAuditoria } from "../../types/auditoria";

// Solo administradores (la API responde 403 al resto).
export function listarHistorialCambios(entidad: EntidadAuditada, idEntidad: string, limit = 50) {
  return apiFetch<{ ok: true; data: RegistroAuditoria[] }>(
    `/api/auditoria${buildQuery({ entidad, idEntidad, limit })}`
  ).then((response) => response.data);
}

const NOMBRES_CAMPO: Record<string, string> = {
  nombre: "Nombre",
  apellido: "Apellido",
  codigo: "Codigo",
  tipoItem: "Tipo",
  idCategoria: "Categoria (id)",
  precio: "Precio",
  costo: "Costo",
  stockMinimo: "Stock minimo",
  activo: "Activo",
  publico: "Publico",
  slug: "Slug",
  descripcionCorta: "Descripcion corta",
  descripcionCompleta: "Descripcion completa",
  observacionesInternas: "Observaciones internas",
  observaciones: "Observaciones",
  tipoMaterial: "Material",
  color: "Color",
  imagenPrincipal: "Imagen principal",
  documento: "Documento",
  telefono: "Telefono",
  email: "Email",
  instagram: "Instagram",
  domicilio: "Domicilio",
  localidad: "Localidad",
  provincia: "Provincia"
};

const CAMPOS_MONEDA = new Set(["precio", "costo"]);

function mostrarValor(campo: string, valor: string | null) {
  if (valor === null || valor === "") {
    return "(vacio)";
  }

  if (valor === "true" || valor === "false") {
    return valor === "true" ? "Si" : "No";
  }

  return CAMPOS_MONEDA.has(campo) ? formatearMoneda(valor) : valor;
}

// "Precio: $ 100,00 → $ 120,00". En un alta (sin antes) solo el valor nuevo.
export function describirCambio(cambio: CambioAuditado) {
  const nombre = NOMBRES_CAMPO[cambio.campo] ?? cambio.campo;
  const despues = mostrarValor(cambio.campo, cambio.despues);

  return cambio.antes === null && cambio.despues !== null
    ? `${nombre}: ${despues}`
    : `${nombre}: ${mostrarValor(cambio.campo, cambio.antes)} → ${despues}`;
}
