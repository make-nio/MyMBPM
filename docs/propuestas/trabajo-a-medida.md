# Trabajo a medida

## Qué hay hoy

- Un pedido a medida entra como **solicitud especial** (nombre, teléfono, descripción, estado).
  "Convertir en pedido" crea un pedido **sin items**, con la descripción en las observaciones del
  cliente.
- Un item de pedido **tiene que ser un item del catálogo**. Toma el precio y el costo del catálogo
  en ese momento y, al confirmar, descuenta su stock.
- Por eso hoy un trabajo a medida no tiene cómo cargarse con su precio: o se crea un item de
  catálogo para cada encargo (ensucia el catálogo), o el pedido queda sin items y sin total.

## Opciones

### A. Item genérico con precio editable

- Un item de catálogo marcado como **"a medida"** (columna nueva `A_MEDIDA`, booleano, migración
  aditiva). Por ejemplo "Trabajo a medida". **No lleva stock:** ni se descuenta al confirmar ni
  aparece en Stock.
- Al agregarlo a un pedido se escriben **la descripción, el precio y, opcionalmente, el costo**
  de ese encargo. Para eso, `PEDIDO_DETALLE` suma `DESCRIPCION` (el `NOMBRE_ITEM_SNAPSHOT` ya guarda
  el nombre) y se permite precio y costo manuales solo para items a medida.
- `confirmar` saltea los items a medida al descontar stock (`stock.service` no se entera).
- "Convertir en pedido" desde una solicitud agrega directamente la línea "Trabajo a medida" con la
  descripción de la solicitud; falta solo el precio.
- **A favor:**
  - el catálogo queda limpio;
  - se carga en segundos;
  - reportes y ganancia funcionan igual (suman el precio y el costo de la línea).
- **En contra:**
  - no hay receta, así que no descuenta insumos solos: si hace falta, se ajusta el stock de insumos
    a mano o con una orden de producción;
  - en los reportes por item, todo lo a medida sale junto como "Trabajo a medida" (el detalle está
    en la descripción).

### B. Item nuevo por encargo

- Cada encargo crea un **item de catálogo propio** (por ejemplo "Trofeo Club Padel 2026"),
  **no público** y marcado como encargo, con su precio, su costo y, si se quiere, su **receta**.
- Se fabrica con una orden de producción como cualquier producto: consume insumos y deja stock de
  ese item, que el pedido descuenta al confirmar.
- **A favor:**
  - costo y consumo de insumos exactos;
  - si el cliente repite el encargo, el item ya está (sirve "Repetir pedido").
- **En contra:**
  - el catálogo se llena de items de un solo uso (se pueden filtrar como "encargo", pero están);
  - cargar un encargo lleva más pasos: item, receta, orden y pedido.

### Recomendación

**A (item genérico con precio editable)** para el día a día. Es lo que pide el trabajo a medida:
rápido, con precio libre y sin tocar el stock. Si un encargo se vuelve repetible, se pasa al
catálogo como producto normal, que ya existe hoy. B conviene solo si Maxi necesita saber cuántos
insumos se gastaron en cada encargo.

### Estimación

- **A:** dos PRs.
  1. Modelo (`A_MEDIDA`, descripción en el item de pedido), reglas en `pedidosService`
     (precio manual y sin stock) y pruebas.
  2. Pantallas (línea a medida en el pedido y conversión desde la solicitud), E2E y Ayuda.

  Alrededor de 1 día y medio.
- **B:** un PR para marcar encargos y el filtro en catálogo; el resto (receta, orden, pedido) ya
  existe. Alrededor de medio día, pero más pasos para Maxi en cada encargo.

## Pregunta para Maxi

**Cuando hacés algo a medida, ¿te alcanza con cargarlo como "Trabajo a medida" con una
descripción y el precio que le pongas, o querés que cada encargo quede como un producto propio con
su receta?**
