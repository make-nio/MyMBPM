import { pedirApi } from "../api";
import { formatearMoneda } from "../formato";
import { CambioAuditado, EntidadAuditada, ValorAuditado } from "../../types/auditoria";

// Solo administradores (la API responde 403 al resto).
export function listarHistorialCambios(entidad: EntidadAuditada, idEntidad: string, limit = 50) {
  return pedirApi("get /api/auditoria", { consulta: { entidad, idEntidad, limit } });
}

// Linea de tiempo de precio y costo de un item, los cambios mas nuevos primero. Solo administradores.
export function listarHistorialPrecios(idItemCatalogo: string, limit: number, offset: number) {
  return pedirApi("get /api/auditoria/precios", { consulta: { idItemCatalogo, limit, offset } });
}

// "$ 100,00 → $ 120,00 (+20 %)". Sin valor anterior (alta, o antes sin cargar) solo el nuevo; sin
// valor nuevo, "(vacio)".
export function describirPrecio(valor: ValorAuditado) {
  const despues = valor.despues === null ? "(vacio)" : formatearMoneda(valor.despues);

  if (valor.antes === null) {
    return despues;
  }

  const anterior = Number(valor.antes);
  const variacion =
    valor.despues !== null && anterior > 0
      ? ` (${Number(valor.despues) >= anterior ? "+" : ""}${porcentaje.format((Number(valor.despues) - anterior) / anterior)})`
      : "";

  return `${formatearMoneda(valor.antes)} → ${despues}${variacion}`;
}

const porcentaje = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 1 });

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
