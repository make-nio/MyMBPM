# Cobros con monto

## Qué hay hoy

- Cada pedido tiene un **estado de cobro**: Pendiente, Señado o Pagado
  (`ESTADOS_COBRO` en `src/compartido/dominio/enums.ts`). Se cambia a mano con "Guardar estado".
- **No se registra cuánto** se cobró, ni cuándo, ni cómo. Con Señado no se sabe cuánto falta.
- Los reportes y el Dashboard suman lo **vendido** (pedidos confirmados), no lo **cobrado**.

## Propuesta

### Modelo (migración aditiva)

- Tabla nueva `COBRO`: `ID_COBRO`, `ID_PEDIDO`, `MONTO` (decimal 18,2, > 0), `ID_MEDIO_PAGO`,
  `FECHA`, `OBSERVACIONES`, `ID_USUARIO`, `ACTIVO` (para anular sin borrar).
- Tabla nueva `MEDIO_PAGO`: `ID_MEDIO_PAGO`, `NOMBRE`, `ACTIVO`, `ORDEN`. Es una **lista
  editable** desde la web, así que el sistema no depende de qué medios use Maxi. Arranca con
  Efectivo, Transferencia y Mercado Pago, que se pueden renombrar, desactivar o sumar.
- El pedido no cambia de forma: `ESTADO_COBRO` pasa a **calcularse** a partir de los cobros:
  - sin cobros: Pendiente;
  - suma menor que el total: Señado;
  - suma igual o mayor: Pagado.
  Se guarda igual en la columna para no romper filtros ni reportes.

### Reglas

- **Saldo** = total del pedido − cobros activos. Se muestra en el detalle y en la lista.
- **Anular un cobro** (por ejemplo, un error de carga) lo marca inactivo y deja historial; no se
  borra.
- **Cobrar de más:** se permite, con aviso ("queda a favor del cliente $ X"). No se bloquea,
  porque pasa con propinas o redondeos.
- **Pedido cancelado con cobros:** los cobros quedan (la plata se cobró). La devolución se
  registra como un cobro negativo, o no se registra. **Esto lo decide Maxi**: se agrega a la
  pregunta si hace falta.
- **Pedidos viejos:** la migración no inventa montos. Los pedidos que hoy dicen Pagado sin
  cobros siguen mostrando Pagado (el estado guardado manda si no hay cobros). Los que dicen
  Señado muestran "saldo sin registrar".

### Pantallas

- En el detalle del pedido, sección **Cobros**: la lista (fecha, medio, monto, quién lo cargó),
  el botón "Registrar cobro" (monto propuesto = saldo) y el saldo.
- El estado de cobro deja de elegirse a mano: sale de los cobros.
- **Reportes:** cobrado en el mes por medio de pago, y "lo que te deben" (suma de saldos de los
  pedidos abiertos).
- **Configuración** (solo administradores): medios de pago.
- El comprobante suma "Pagado a la fecha" y "Saldo".

### Estimación

Tres PRs:
1. modelo, API de cobros y medios de pago, con pruebas de service;
2. pantalla de cobros en el pedido, E2E y Ayuda;
3. reportes de cobrado y saldo.

Unos 2 a 3 días de trabajo. La migración es aditiva: puede entrar sin pantallas.

### Riesgos

- Si Maxi no carga los cobros de forma consistente, el saldo miente. Mitigación: el "Registrar
  cobro" trae el saldo precargado, así que cobrar todo es un clic.

## Pregunta para Maxi

**Cuando un cliente te seña o te paga, ¿querés anotar cuánto y cómo pagó (efectivo,
transferencia, Mercado Pago...), para ver cuánto te deben de cada pedido?**
