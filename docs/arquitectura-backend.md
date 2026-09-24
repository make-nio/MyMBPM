# Arquitectura Backend

## Principios del sistema

1. El stock solo se modifica desde `stock.service.ts`.
2. Toda operacion que impacte stock debe ejecutarse en transaccion.
3. Los services no acceden a Prisma directamente si existe repository.
4. Los controllers no contienen logica de negocio.
5. Las entidades criticas usan enums de dominio (`src/compartido/dominio/enums.ts`).
6. El stock tiene idempotencia: reintentar una operacion no descuenta dos veces
   ([idempotencia-stock.md](idempotencia-stock.md)).
7. Cada movimiento toma un lock por item (`stockRepository.bloquearItem`, `pg_advisory_xact_lock`) y
   corre en transaccion. Si una operacion mueve varios items, se procesan con `ordenarPorItem`
   (orden de id) para no provocar deadlocks.

## Forma de un modulo

Cada modulo vive en `src/modulos/<modulo>/` con cinco archivos: `routes` → `controller` →
`service` → `repository`, mas `schemas` (zod). El mas simple para copiar es `clientes`.

- **routes**: la ruta, `asyncHandler` y, si hace falta, `requerirAdministrador`.
- **controller**: valida con `validar(schema, ...)`, llama al service y responde con
  `responderExito`. Sin logica de negocio.
- **service**: las reglas, las transacciones (`prisma.$transaction`) y los errores de dominio
  (`ErrorNoEncontrado`, `ErrorConflicto`, `ErrorValidacion`, ...). Su prueba es
  `<modulo>.service.test.ts`, con el repository y `$transaction` mockeados.
- **repository**: las consultas Prisma. Recibe `prisma` o la transaccion (`PrismaOrTx`).

## Mapa de modulos

| Modulo | Rutas (`/api/...`) | Que hace |
| --- | --- | --- |
| `salud` | `health` | Estado de la API y de la base, sin sesion. Ver [despliegue-netlify.md](despliegue-netlify.md#monitoreo-apihealth) |
| `autenticacion` | `autenticacion/login`, `autenticacion/me` | JWT y limite de intentos (abajo) |
| `usuarios` | `usuarios` | Alta inicial sin sesion; gestion solo administradores; cada uno cambia su clave |
| `categorias`, `items-catalogo` | `categorias`, `items-catalogo` | Catalogo, receta (componentes) e imagenes. Auditado |
| `importacion-catalogo` | `items-catalogo/importacion` | Importacion de items desde CSV (abajo) |
| `clientes` | `clientes` | Clientes y `/:id/resumen` (compras confirmadas, sin canceladas). Auditado |
| `importacion-clientes` | `clientes/importacion` | Importacion de clientes desde CSV (abajo) |
| `stock` | `stock` | Existencias, historial, bajo stock y ajustes manuales. **Unico que escribe stock** |
| `pedidos` | `pedidos` | Pedidos, items con precio y costo congelados, estados, confirmar (descuenta stock), repetir |
| `produccion` | `produccion` | Ordenes: iniciar (consume insumos) y finalizar (ingresa productos) |
| `solicitudes-especiales` | `solicitudes-especiales` | Pedidos a medida; se convierten en pedido |
| `panel` | `panel/resumen`, `panel/avisos` | Dashboard y avisos del encabezado. Solo lectura |
| `busqueda` | `busqueda?q=` | Busqueda global de pedidos, clientes e items (desde 2 caracteres) |
| `reportes` | `reportes/ventas-mes`, `reportes/ventas-por-mes` | Ventas del mes y de 12 meses. Administradores |
| `auditoria` | `auditoria`, `auditoria/precios` | Historial de cambios y de precio y costo. Administradores |

Aparte de los modulos, `src/respaldo/` arma el respaldo logico diario ([respaldos.md](respaldos.md)).

## Recorrido de una solicitud

`app.ts` y `routes/index.ts`, en orden:

1. `referenciaMiddleware`: cada solicitud lleva una referencia corta (`X-Referencia`, "3F9A-12BC")
   que aparece en el log y en la respuesta de error, para encontrarla cuando alguien avisa.
2. `encabezadosSeguridadMiddleware`: `nosniff`, `X-Frame-Options`, `Referrer-Policy` y
   `Cache-Control: no-store`.
3. JSON: hasta 100 KB, y 2 MB en las importaciones. Un cuerpo que no es JSON valido da **400** y
   uno demasiado grande, **413**.
4. Rutas publicas: `health`, `autenticacion` y el alta inicial de usuario.
5. `requerirAutenticacion` y `ocultarCostosSinPermiso` (abajo), para todas las demas.
6. `noEncontradoMiddleware` y `manejoErroresMiddleware`: los errores de dominio salen con su codigo
   HTTP y un mensaje en espanol; lo inesperado, con 500 y la referencia, sin detalles internos.

## Fechas: dia de Argentina

"Hoy", "este mes" o una fecha de entrega se calculan en hora de Argentina (UTC-3, sin horario de
verano) con `compartido/dominio/fecha-argentina.ts`, no con la hora del servidor (UTC). Lo usan el
Dashboard, los avisos, los reportes y la fecha de entrega prometida.

## Limite de intentos de ingreso

`POST /api/autenticacion/login` rechaza con **429** (`DEMASIADOS_INTENTOS`) cuando hay:

- **5 fallidos en 15 minutos para la misma cuenta.** Usuario y email cuentan juntos. Si la cuenta no
  existe, se cuenta por lo que se escribio.
- **20 fallidos en 15 minutos desde la misma IP.** Es mas alto porque varias personas pueden salir
  por la misma IP; frena a quien prueba muchas cuentas.

El bloqueo dura 15 minutos desde el ultimo fallido. Mientras dura, no se verifica la clave ni se
suman fallidos. Un ingreso correcto limpia los fallidos de la cuenta y de la IP.

- Los fallidos se guardan en `INTENTO_LOGIN`. Cada fallido nuevo borra, en la misma transaccion,
  los de **cualquier** clave con mas de 24 horas. No hace falta una tarea programada: la tabla solo
  crece con fallidos, y cada fallido la limpia. Un ingreso correcto borra los de su cuenta y su IP.
- La regla esta en `autenticacion/limite-intentos.ts`.
- La IP sale de `x-nf-client-connection-ip`, que pone el CDN de Netlify. `x-forwarded-for` no se
  usa porque el cliente puede agregarle valores.

## Historial de cambios (auditoria)

Las altas, ediciones y activaciones de **items del catalogo** y **clientes** quedan en
`AUDITORIA_CAMBIO`, con entidad, id, accion (`ALTA`, `MODIFICACION`, `ACTIVACION`,
`DESACTIVACION`), usuario, fecha y `CAMBIOS` = `[{ campo, antes, despues }]` como texto.

- Lo registra el service del modulo con `auditoriaService.registrarAlta` o
  `registrarModificacion`, **en la misma transaccion** que el cambio. Los campos auditados son
  `CAMPOS_AUDITADOS_ITEM` y `CAMPOS_AUDITADOS_CLIENTE`, entre ellos precio, costo y stock minimo.
- Solo se guardan los campos que cambiaron. Guardar sin cambios no deja registro, y vacio y
  `null` cuentan como lo mismo.
- `GET /api/auditoria?entidad=ITEM_CATALOGO|CLIENTE&idEntidad=N` es solo para administradores.
  Devuelve del usuario solo id, nombre y apellido.
- Si la tabla no existe (deploy preview antes de migrar), el cambio se guarda igual, sin
  registro, y queda un aviso en el log. Se pregunta con `to_regclass` antes del INSERT porque
  en Postgres un INSERT fallido aborta toda la transaccion.
- `GET /api/auditoria/precios?idItemCatalogo=N` (administradores) arma la linea de tiempo de precio
  y costo del item: los registros que tocaron alguno de los dos, filtrados en la base con
  `array_contains` (el `@>` de Postgres sobre `CAMBIOS`), con el valor anterior y el nuevo.

## Costos: solo para quien puede verlos

`puedeVerCostos(usuario)` (`compartido/dominio/permisos.ts`) decide quien ve costos: hoy, solo
administradores.

- **Respuestas:** `ocultarCostosSinPermiso`, en todas las rutas privadas, quita `costo` y
  `costoUnitario` de cualquier respuesta, a cualquier profundidad. Asi no se escapan en items
  incluidos dentro de pedidos, ordenes o recetas, ni en endpoints nuevos.
- **Panel:** no calcula `ventasDelMes`.
- **Pedido:** ademas lo filtra explicitamente (`pedidosService.presentar`).
- **Altas y ediciones de items:** `rechazarCostoSinPermiso` responde 403 si alguien sin permiso
  manda `costo`.

Para abrirlo a operadores se cambia solo `puedeVerCostos`.

## Importaciones desde CSV

Items del catalogo (`items-catalogo/importacion`) y clientes (`clientes/importacion`), solo
administradores. La web lee el CSV, mapea las columnas y manda las filas como JSON.

- **Previsualizar** (`POST .../previsualizar`) valida todas las filas contra el archivo y contra la
  base y devuelve cuales estan bien y el error de cada una. No escribe nada.
- **Importar** (`POST ...`) vuelve a validar y, si no hay ningun error, crea todo en **una
  transaccion**: se importa todo o nada. Hasta 1000 filas por archivo.
- Un advisory lock fijo por tipo de importacion (`4_101_002` catalogo, `4_101_003` clientes)
  serializa dos importaciones a la vez, para que no pasen las dos la validacion de duplicados.
- Duplicados: un item con el mismo nombre (slug) o codigo que uno existente o que otra fila; un
  cliente con el mismo email, documento, o nombre + apellido + telefono. Esa fila sale con error, no
  se duplica.
- Las altas quedan en la auditoria con `registrarAltas` (una sola consulta). En el catalogo, las
  categorias que no existen se crean.

## Pedidos: repetir

`GET /api/pedidos/:id/repeticion` devuelve el cliente y los items del pedido con los **precios y
costos de hoy**, y avisa cuales ya no se pueden pedir (el item ya no existe, esta inactivo o no tiene precio). No crea nada.
`POST /api/pedidos/:id/repetir` crea, en una transaccion, un pedido nuevo en estado pendiente con
esos items, congelando precio y costo como cualquier item agregado a mano. En sus observaciones
internas queda "Repetido de PED-...". No toca el stock: el stock se descuenta al confirmar.

## Panel y avisos

`panel/resumen` (Dashboard) y `panel/avisos` (campanita del encabezado) solo leen. El stock bajo el
minimo sale de `stockService.obtenerExistencias`, como en la pantalla de Stock. Las entregas cuentan
los pedidos abiertos (pendiente, confirmado, en preparacion, listo) segun la fecha prometida: atrasada
si es anterior a hoy y de hoy si cae en el dia de Argentina. Nada se guarda: se calcula al consultar.

## Operacion

- Monitoreo: `/api/health` ([despliegue-netlify.md](despliegue-netlify.md#monitoreo-apihealth)).
- Respaldos diarios y restauracion: [respaldos.md](respaldos.md).
- Encabezados de seguridad y CSP de la web: [despliegue-netlify.md](despliegue-netlify.md#encabezados-de-seguridad).
- Prueba de humo despues de cada deploy, presupuesto de Lighthouse y E2E nocturno: README,
  "Build, checks y tests".

