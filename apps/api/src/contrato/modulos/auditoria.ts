import { Endpoint, fecha, id, lista, objeto, z } from "../base";
import { ACCIONES_AUDITORIA, ENTIDADES_AUDITADAS } from "../../compartido/dominio/enums";
import { historialPreciosQuerySchema, listarAuditoriaQuerySchema } from "../../modulos/auditoria/auditoria.schemas";

// Valores guardados como texto (valorAuditable): Decimal, BigInt y fechas ya convertidos.
const cambioAuditado = objeto({
  campo: z.string(),
  antes: z.string().nullable(),
  despues: z.string().nullable()
});

// Solo id, nombre y apellido: nunca claveHash. null si el cambio no tiene usuario.
const usuarioAuditoria = objeto({
  idUsuario: id,
  nombre: z.string(),
  apellido: z.string()
}).nullable();

// Modelo AuditoriaCambio con include usuario. `cambios` es JSON: un arreglo de CambioAuditado.
const registroAuditoria = objeto({
  idAuditoriaCambio: id,
  entidad: z.enum(ENTIDADES_AUDITADAS),
  idEntidad: id,
  accion: z.enum(ACCIONES_AUDITORIA),
  cambios: lista(cambioAuditado),
  idUsuario: id.nullable(),
  fecha,
  usuario: usuarioAuditoria
}).openapi("RegistroAuditoria");

const valorAuditado = objeto({
  antes: z.string().nullable(),
  despues: z.string().nullable()
});

// Punto armado a mano en auditoriaService.listarPrecios.
const puntoPrecio = objeto({
  idAuditoriaCambio: id,
  fecha,
  accion: z.enum(ACCIONES_AUDITORIA),
  usuario: usuarioAuditoria,
  precio: valorAuditado.nullable(),
  // La clave se llama "costo": ocultarCostosSinPermiso la quitaria sin permiso (la ruta ya exige
  // administrador, que hoy es lo mismo que puedeVerCostos).
  costo: valorAuditado.nullable().optional()
}).openapi("PuntoPrecio");

export const endpoints = [
  {
    metodo: "get",
    ruta: "/api/auditoria",
    resumen: "Historial de cambios de un item o un cliente, del mas nuevo al mas viejo (solo administradores)",
    etiqueta: "auditoria",
    query: listarAuditoriaQuerySchema,
    respuesta: lista(registroAuditoria)
  },
  {
    metodo: "get",
    ruta: "/api/auditoria/precios",
    resumen: "Linea de tiempo de precio y costo de un item (solo administradores)",
    etiqueta: "auditoria",
    query: historialPreciosQuerySchema,
    respuesta: lista(puntoPrecio)
  }
] as const satisfies readonly Endpoint[];
