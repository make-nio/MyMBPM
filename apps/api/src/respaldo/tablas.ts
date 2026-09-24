// Tablas que entran en el respaldo, en orden de dependencias: cada una solo referencia a las
// anteriores, asi la restauracion las inserta en este orden sin desactivar las claves foraneas.
// Si una migracion suma una tabla, el respaldo falla hasta que se agregue aca (o en EXCLUIDAS).
export const TABLAS_RESPALDO = [
  "USUARIO",
  "CATEGORIA",
  "ITEM_CATALOGO",
  "ITEM_CATALOGO_IMAGEN",
  "ITEM_CATALOGO_COMPONENTE",
  "CLIENTE",
  "PEDIDO",
  "PEDIDO_DETALLE",
  "SOLICITUD_ESPECIAL",
  "ESTADO_STOCK",
  "ORDEN_PRODUCCION",
  "ORDEN_PRODUCCION_DETALLE",
  "ORDEN_PRODUCCION_CONSUMO",
  "AUDITORIA_CAMBIO"
] as const;

// Fuera del respaldo: los intentos de ingreso y los cortes de sesion son de vida corta (una
// base restaurada arranca sin sesiones: las claves tampoco viajan) y la tabla de Prisma se recrea
// al migrar la base de destino.
export const TABLAS_EXCLUIDAS = ["INTENTO_LOGIN", "USUARIO_SESION", "_prisma_migrations"] as const;

// Columnas que no se guardan. Las claves no salen de la base de produccion: al restaurar, los
// usuarios quedan sin poder ingresar hasta que se les asigne una clave nueva.
export const COLUMNAS_OMITIDAS: Partial<Record<(typeof TABLAS_RESPALDO)[number], string[]>> = {
  USUARIO: ["CLAVE_HASH"]
};

// Lo que va en CLAVE_HASH al restaurar: no es un hash de bcrypt, asi que ninguna clave coincide.
export const CLAVE_INHABILITADA = "!respaldo-sin-clave";
