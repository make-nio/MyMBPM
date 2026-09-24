# Backend Bloque 1

## Infraestructura compartida

- `GET /`
- `GET /api/health` (publico, sin sesion): estado de la API y de la base. 200 si la base responde,
  503 si no. Detalle y como apuntarle un monitor: `docs/despliegue-netlify.md`, "Monitoreo".

## Categorias

- `GET /api/categorias`
- `GET /api/categorias/:id`
- `POST /api/categorias`
- `PATCH /api/categorias/:id`
- `PATCH /api/categorias/:id/estado`

Paginacion:

- `limit`
- `offset`

## Items Catalogo

- `GET /api/items-catalogo` (filtros `busqueda` por nombre o codigo, `tipoItem`, `idCategoria`, `activo`, `publico`)
- `GET /api/items-catalogo/:id`
- `POST /api/items-catalogo`
- `PATCH /api/items-catalogo/:id`
- `PATCH /api/items-catalogo/:id/estado`
- `POST /api/items-catalogo/:id/imagenes`
- `DELETE /api/items-catalogo/:id/imagenes/:imagenId`

Filtros soportados en listado:

- `limit`
- `offset`
- `tipoItem`
- `idCategoria`
- `activo`
- `publico`

## Clientes

- `GET /api/clientes`
- `GET /api/clientes/:id`
- `POST /api/clientes`
- `PATCH /api/clientes/:id`
- `PATCH /api/clientes/:id/estado`

Filtros soportados en listado:

- `limit`
- `offset`
- `busqueda`
- `activo`

## Auditoria

- `GET /api/auditoria?entidad=ITEM_CATALOGO&idEntidad=1&limit=50&offset=0` (solo administradores)

## Importacion de catalogo (solo administradores)

- `POST /api/items-catalogo/importacion/previsualizar` `{ filas: [...] }`: valida cada fila contra el
  catalogo actual sin escribir. Devuelve `filas` (`numero` de fila del archivo, `errores`, `item`) y
  `resumen` (`total`, `validas`, `conErrores`, `categoriasNuevas`).
- `POST /api/items-catalogo/importacion` `{ filas: [...] }`: vuelve a validar dentro de una
  transaccion (con un advisory lock) y, si no hay errores, crea las categorias nuevas, los items y su
  auditoria de alta, todo junto. Con errores responde 409 y no crea nada.
- Cada fila son textos como vienen del CSV: `nombre`, `tipo` (Producto/Insumo), `categoria`,
  `codigo`, `precio`, `costo` (acepta `1.234,50`), `stockMinimo`, `material`, `color`,
  `descripcionCorta`, `activo` (Si/No). Hasta 1000 filas; el cuerpo de estas rutas admite 2 MB.
- Un nombre (su slug) o un codigo que ya existe, o que se repite en el archivo, es un error de fila.
  El stock inicial no se importa: se carga con ajustes desde Stock.
