# Modelado Inicial MVP

## Estructura Propuesta Backend

```text
apps/api/src/
  app.ts
  server.ts
  config/
  lib/
  modulos/
    autenticacion/
      autenticacion.controller.ts
      autenticacion.service.ts
      autenticacion.routes.ts
      autenticacion.schemas.ts
    usuarios/
      usuarios.controller.ts
      usuarios.service.ts
      usuarios.routes.ts
      usuarios.schemas.ts
    categorias/
    items-catalogo/
    clientes/
    pedidos/
    stock/
    produccion/
    solicitudes-especiales/
  compartido/
    errores/
    middlewares/
    utilidades/
```

### Criterios

- Controllers livianos: validan entrada HTTP, delegan y serializan salida.
- Services por dominio: concentran reglas de negocio.
- El acceso a Prisma debe quedar encapsulado por modulo, no disperso en controllers.
- `stock` y `produccion` deben mantenerse desacoplados de `pedidos`; se conectan por reglas de aplicacion, no por automatismos ocultos.

## Estructura Propuesta Frontend

```text
apps/web/
  app/
    (publico)/
      page.tsx
      catalogo/
      categorias/
      producto/[slug]/
      carrito/
      contacto/
      confirmacion-pedido/
    (privado)/
      admin/
        page.tsx
        usuarios/
        clientes/
        categorias/
        items-catalogo/
        pedidos/
        stock/
        produccion/
        solicitudes-especiales/
  components/
    publico/
    privado/
    ui/
  lib/
    api/
    auth/
    utils/
  types/
```

### Criterios

- Separacion explicita entre area publica y privada usando route groups.
- Tipos compartidos del frontend aislados en `types/`.
- Adaptadores HTTP en `lib/api/` para no mezclar fetchs con componentes.
- `ui/` solo para componentes reutilizables y sin logica de dominio.

## Ajustes Realizados en Prisma

- Modelos en espanol y en singular: `Usuario`, `Pedido`, `OrdenProduccion`, etc.
- Tablas y columnas mapeadas en SQL Server en espanol, mayusculas y con `_`.
- Todas las PK definidas como `BIGINT` autoincremental.
- `PEDIDO` se mantiene como entidad comercial principal; no se modela `VENTA`.
- `ESTADO_STOCK` queda como historial; el stock vigente se obtiene por ultimo ID del item.
- `ITEM_CATALOGO` unifica productos e insumos y se complementa con `ITEM_CATALOGO_COMPONENTE`.

## Observaciones e Inconsistencias Menores Detectadas

### 1. Colision de nombres en `ITEM_CATALOGO_COMPONENTE`

La especificacion proponia:

- `ID_ITEM_CATALOGO_COMPONENTE` como PK
- `ID_ITEM_CATALOGO_COMPONENTE` tambien como FK al item componente

Eso genera colision. En el schema se resolvio con:

- PK: `ID_ITEM_CATALOGO_COMPONENTE`
- FK al item hijo/componente: `ID_ITEM_CATALOGO_COMPONENTE_HIJO`

### 2. Estados modelados como `String`

Para SQL Server en Prisma MVP se modelaron como `String`:

- `TIPO_ITEM`
- `ORIGEN_PEDIDO`
- `ESTADO_PEDIDO`
- `ESTADO_COBRO`
- `ESTADO_SOLICITUD`
- `TIPO_STOCK`
- `TIPO_MOVIMIENTO`
- `ORIGEN_MOVIMIENTO`
- `ESTADO_PRODUCCION`

La validacion fuerte debe vivir en schemas/DTOs y services.

### 3. Unicidad de campos opcionales

Por ahora no se define unicidad sobre campos opcionales como:

- `CLIENTE.EMAIL`
- `CLIENTE.DOCUMENTO`
- `ITEM_CATALOGO.CODIGO`

Motivo:

- en SQL Server una restriccion unica sobre columnas nullable puede traer friccion operativa
- para el MVP conviene mantener solo las PK como unica restriccion obligatoria

### 4. `SOLICITUD_ESPECIAL` con `ID_CLIENTE` opcional

Se dejo `ID_CLIENTE` opcional porque puede existir una solicitud entrante sin cliente previo creado.

### 5. `TOTAL` en `PEDIDO` persistido

Se modela como snapshot persistido y no solo calculado al vuelo. Eso simplifica auditoria y evita drift historico si luego cambian precios.

## Confirmaciones Cerradas Para MVP

1. Los estados string actuales se consideran validos para el MVP.
2. Por ahora no se agregan restricciones unicas extra sobre campos opcionales.
3. `ORDEN_PRODUCCION` no llevara usuario responsable por ahora.

## Siguiente Paso Recomendado

1. generar la migracion inicial del dominio
2. aplicar la migracion a SQL Server
3. recien ahi crear modulos base de backend por dominio
4. despues montar el esqueleto de rutas publicas y privadas en frontend
