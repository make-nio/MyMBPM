import { Endpoint } from "./base";
import { endpoints as salud } from "./modulos/salud";
import { endpoints as autenticacion } from "./modulos/autenticacion";
import { endpoints as usuarios } from "./modulos/usuarios";
import { endpoints as categorias } from "./modulos/categorias";
import { endpoints as itemsCatalogo } from "./modulos/items-catalogo";
import { endpoints as importacionCatalogo } from "./modulos/importacion-catalogo";
import { endpoints as clientes } from "./modulos/clientes";
import { endpoints as importacionClientes } from "./modulos/importacion-clientes";
import { endpoints as stock } from "./modulos/stock";
import { endpoints as panel } from "./modulos/panel";
import { endpoints as pedidos } from "./modulos/pedidos";
import { endpoints as produccion } from "./modulos/produccion";
import { endpoints as solicitudesEspeciales } from "./modulos/solicitudes-especiales";
import { endpoints as auditoria } from "./modulos/auditoria";
import { endpoints as reportes } from "./modulos/reportes";
import { endpoints as busqueda } from "./modulos/busqueda";

// Todos los endpoints de la API, por modulo (un archivo por modulo en ./modulos). Una prueba
// (contrato.test.ts) falla si una ruta de Express no esta aca o si aca hay una que no existe.
export const endpoints: Endpoint[] = [
  ...salud,
  ...autenticacion,
  ...usuarios,
  ...categorias,
  ...itemsCatalogo,
  ...importacionCatalogo,
  ...clientes,
  ...importacionClientes,
  ...stock,
  ...panel,
  ...pedidos,
  ...produccion,
  ...solicitudesEspeciales,
  ...auditoria,
  ...reportes,
  ...busqueda
];
