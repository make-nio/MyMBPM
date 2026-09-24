# Devolver el stock al cancelar

## Qué hay hoy

- **Pedidos.** Al confirmar, `pedidosService.confirmar` descuenta del stock cada item
  (`EGRESO_PEDIDO`, origen `PEDIDO`, con el pedido y el item de pedido como referencia). Un pedido
  confirmado, en preparación o listo se puede **cancelar**, y hoy eso **no devuelve nada**: el
  stock queda descontado y hay que sumarlo a mano con un ajuste. La Ayuda lo avisa.
- **Producción.** Al iniciar se descuentan los insumos (`EGRESO_PRODUCCION`, con su registro en
  `ORDEN_PRODUCCION_CONSUMO`) y al finalizar ingresan los productos. Una orden **en proceso** se
  puede cancelar, y los insumos consumidos tampoco vuelven.
- `stock.service` **ya tiene** `registrarReverso` (movimiento `REVERSO`, que suma), pero nadie lo
  usa. La idempotencia ya cubre este caso: el índice único `UQ_ESTADO_STOCK_IDEMPOTENCIA`
  (origen, referencia, detalle, item, tipo) admite un solo `REVERSO` por item de pedido, así que
  reintentar una cancelación no puede devolver dos veces.

## Opciones

### A. Automático

Cancelar un pedido que ya descontó stock devuelve **todo** lo descontado, en la misma transacción
que el cambio de estado.

- En `pedidosService.actualizarEstado`, al pasar a `CANCELADO` desde un estado que descontó
  (confirmado, en preparación, listo), se llama a `stockService.registrarReverso` por cada item.
  Referencia: el pedido y el item de pedido. Se procesan en orden de item (`ordenarPorItem`) y
  bajo el lock por item de siempre.
- Lo que no se toca: la cancelación de un pedido **pendiente** (no descontó nada) y los pedidos
  **entregados** (no se pueden cancelar).
- En producción: cancelar una orden **en proceso** devuelve los insumos de su
  `ORDEN_PRODUCCION_CONSUMO` con `REVERSO`, origen `PRODUCCION`.
- **A favor:** simple, sin preguntas, el stock nunca queda mal por olvido.
- **En contra:** si los productos se rompieron o ya se usaron para otra cosa, vuelven al stock
  igual, y hay que corregir con un ajuste negativo.

### B. Preguntando al cancelar

El diálogo de cancelar muestra lo que se descontó y **pregunta** qué devolver:
- "Devolver todo al stock";
- "No devolver nada";
- o, por item, cuánto vuelve (de 0 a lo descontado).

- La API recibe la lista de lo que vuelve (`[{ idPedidoDetalle, cantidad }]`), valida que no
  supere lo descontado y registra un `REVERSO` por item, en la misma transacción. La idempotencia
  es la misma que en A.
- En producción, lo mismo con los insumos consumidos.
- **A favor:** refleja la realidad (se devuelve lo que de verdad vuelve).
- **En contra:** un paso más en cada cancelación, y la posibilidad de equivocarse al elegir.

### Impacto común

- **Sin migración:** `REVERSO` ya existe en el enum y en la base.
- **Todo pasa por `stock.service`**, en la transacción de la cancelación. No se toca ninguna tabla
  de stock desde otro módulo.
- El movimiento queda con el usuario y con "Cancelación del pedido PED-…", así que se ve en
  Stock → movimientos.
- **Pruebas:**
  - service: cancelar dos veces no devuelve dos veces; pendiente no devuelve; orden de locks;
  - E2E: el stock vuelve y se ve en movimientos.
- **Ayuda:** se reemplaza el "Ojo: cancelar no devuelve el stock".

### Recomendación

**A (automático)**, con el diálogo de confirmación mostrando "Vuelven al stock: …". Es el caso
común, y el raro (algo se rompió) se corrige con un ajuste negativo, que ya existe y deja motivo.
B tiene sentido si cancelar con productos dañados es frecuente.

### Estimación

- **A:** un PR que cubre pedidos y producción, con pruebas de service y E2E. Unas 4 a 6 horas.
- **B:** uno o dos PRs (API con la lista a devolver, más el diálogo por item). Alrededor de 1 día.

## Pregunta para Maxi

**Cuando se cancela un pedido que ya descontó stock, ¿los productos vuelven siempre al stock, o
preferís que el sistema te pregunte cada vez?**
