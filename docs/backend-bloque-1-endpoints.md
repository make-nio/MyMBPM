# Backend Bloque 1

## Infraestructura compartida

- `GET /`
- `GET /api/health`

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

- `GET /api/items-catalogo`
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
