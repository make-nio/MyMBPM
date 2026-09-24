-- Volumen para medir consultas (EXPLAIN ANALYZE): 500 items, 2.000 clientes, 20.000 pedidos de
-- los ultimos 3 anios con sus items, movimientos de stock, ordenes de produccion y auditoria.
-- Los valores no tienen que cerrar entre si (no es una demo): importan las cantidades y la
-- distribucion (estados, fechas). Solo sobre una base local vacia y migrada; lo corre
-- scripts/volumen/medir-consultas.ts, que se niega si la base no es local.
BEGIN;

SELECT setseed(0.42);

INSERT INTO "USUARIO" ("NOMBRE", "APELLIDO", "EMAIL", "USUARIO", "CLAVE_HASH", "ES_ADMINISTRADOR", "FECHA_MODIFICACION")
VALUES ('Admin', 'Volumen', 'admin@volumen.local', 'admin-volumen', 'x', true, now());

INSERT INTO "CATEGORIA" ("NOMBRE", "SLUG", "FECHA_MODIFICACION")
SELECT 'Categoria ' || g, 'categoria-' || g, now() FROM generate_series(1, 20) g;

-- 100 insumos y 400 productos.
INSERT INTO "ITEM_CATALOGO" ("ID_CATEGORIA", "TIPO_ITEM", "NOMBRE", "SLUG", "CODIGO", "PRECIO", "COSTO", "STOCK_MINIMO", "ACTIVO", "FECHA_MODIFICACION")
SELECT
  (SELECT min("ID_CATEGORIA") FROM "CATEGORIA") + (g % 20),
  CASE WHEN g <= 100 THEN 'INSUMO' ELSE 'PRODUCTO' END,
  CASE WHEN g <= 100 THEN 'Filamento ' || g ELSE 'Producto impreso ' || g END,
  'item-volumen-' || g,
  'COD-' || g,
  CASE WHEN g <= 100 THEN NULL ELSE round((1000 + random() * 20000)::numeric, 2) END,
  round((100 + random() * 5000)::numeric, 2),
  (random() * 10)::int,
  random() > 0.05,
  now()
FROM generate_series(1, 500) g;

INSERT INTO "CLIENTE" ("NOMBRE", "APELLIDO", "DOCUMENTO", "TELEFONO", "EMAIL", "LOCALIDAD", "ACTIVO", "FECHA_ALTA", "FECHA_MODIFICACION")
SELECT
  (ARRAY['Juan','Maria','Lucia','Pedro','Sofia','Martin','Carla','Diego','Ana','Tomas'])[1 + g % 10],
  (ARRAY['Gomez','Perez','Rodriguez','Fernandez','Lopez','Diaz','Martinez','Romero','Suarez','Alvarez'])[1 + (g / 10) % 10] || ' ' || g,
  (20000000 + g)::text,
  '11' || lpad((40000000 + g * 7)::text, 8, '0'),
  'cliente' || g || '@correo.test',
  (ARRAY['CABA','La Plata','Rosario','Cordoba','Mendoza'])[1 + g % 5],
  random() > 0.03,
  now() - (random() * interval '3 years'),
  now()
FROM generate_series(1, 2000) g;

-- 20.000 pedidos: la mayoria entregados; algunos abiertos, con y sin fecha de entrega.
INSERT INTO "PEDIDO" ("ID_CLIENTE", "NUMERO_PEDIDO", "ORIGEN_PEDIDO", "ESTADO_PEDIDO", "ESTADO_COBRO", "SUBTOTAL", "TOTAL", "FECHA_ALTA", "FECHA_CONFIRMACION", "FECHA_ENTREGA", "ACTIVO", "FECHA_MODIFICACION")
SELECT
  (SELECT min("ID_CLIENTE") FROM "CLIENTE") + (random() * 1999)::int,
  'PED-' || lpad(g::text, 6, '0'),
  (ARRAY['INSTAGRAM','WHATSAPP','WEB','PRESENCIAL'])[1 + g % 4],
  estado,
  CASE WHEN estado IN ('ENTREGADO') THEN 'PAGADO' WHEN random() > 0.5 THEN 'SENADO' ELSE 'PENDIENTE' END,
  0, 0,
  alta,
  CASE WHEN estado IN ('PENDIENTE') OR (estado = 'CANCELADO' AND random() > 0.5) THEN NULL ELSE alta + interval '1 day' END,
  CASE WHEN random() > 0.4 THEN (alta + interval '7 days')::date ELSE NULL END,
  true,
  now()
FROM (
  SELECT g,
    now() - ((20000 - g) * interval '78 minutes') AS alta,
    CASE
      WHEN g > 19900 THEN (ARRAY['PENDIENTE','CONFIRMADO','EN_PREPARACION','LISTO'])[1 + g % 4]
      WHEN random() < 0.06 THEN 'CANCELADO'
      ELSE 'ENTREGADO'
    END AS estado
  FROM generate_series(1, 20000) g
) p;

-- 1 a 4 items por pedido, solo productos.
INSERT INTO "PEDIDO_DETALLE" ("ID_PEDIDO", "ID_ITEM_CATALOGO", "NOMBRE_ITEM_SNAPSHOT", "CANTIDAD", "PRECIO_UNITARIO", "COSTO_UNITARIO", "SUBTOTAL", "FECHA_ALTA", "FECHA_MODIFICACION")
SELECT p."ID_PEDIDO", i."ID_ITEM_CATALOGO", i."NOMBRE", d.cantidad, i."PRECIO", i."COSTO", i."PRECIO" * d.cantidad, p."FECHA_ALTA", now()
FROM "PEDIDO" p
CROSS JOIN LATERAL generate_series(1, 1 + (p."ID_PEDIDO" % 4)) n
CROSS JOIN LATERAL (SELECT 1 + (random() * 3)::int AS cantidad, (SELECT min("ID_ITEM_CATALOGO") FROM "ITEM_CATALOGO") + 100 + ((p."ID_PEDIDO" * 7 + n * 13) % 400) AS id_item) d
JOIN "ITEM_CATALOGO" i ON i."ID_ITEM_CATALOGO" = d.id_item;

UPDATE "PEDIDO" p SET "SUBTOTAL" = t.s, "TOTAL" = t.s
FROM (SELECT "ID_PEDIDO", sum("SUBTOTAL") s FROM "PEDIDO_DETALLE" GROUP BY "ID_PEDIDO") t
WHERE t."ID_PEDIDO" = p."ID_PEDIDO";

-- Un egreso por item de cada pedido confirmado, en orden de alta.
INSERT INTO "ESTADO_STOCK" ("ID_ITEM_CATALOGO", "TIPO_STOCK", "STOCK_ACTUAL", "STOCK_ANTERIOR", "TIPO_MOVIMIENTO", "CANTIDAD_MOVIMIENTO", "ORIGEN_MOVIMIENTO", "ID_REFERENCIA_ORIGEN", "ID_REFERENCIA_DETALLE", "FECHA_ALTA")
SELECT d."ID_ITEM_CATALOGO", 'PRODUCTO', 50, 50 + d."CANTIDAD", 'EGRESO_VENTA', d."CANTIDAD", 'PEDIDO', d."ID_PEDIDO", d."ID_PEDIDO_DETALLE", p."FECHA_CONFIRMACION"
FROM "PEDIDO_DETALLE" d JOIN "PEDIDO" p ON p."ID_PEDIDO" = d."ID_PEDIDO"
WHERE p."FECHA_CONFIRMACION" IS NOT NULL
ORDER BY p."FECHA_CONFIRMACION", d."ID_PEDIDO_DETALLE";

-- 3.000 ordenes de produccion finalizadas con su ingreso y el consumo de un insumo.
INSERT INTO "ORDEN_PRODUCCION" ("ESTADO_PRODUCCION", "FECHA_ALTA", "FECHA_INICIO", "FECHA_FIN", "FECHA_MODIFICACION")
SELECT CASE WHEN g > 2990 THEN 'PENDIENTE' ELSE 'FINALIZADA' END, now() - ((3000 - g) * interval '8 hours'),
       now() - ((3000 - g) * interval '8 hours'), now() - ((3000 - g) * interval '8 hours'), now()
FROM generate_series(1, 3000) g;

INSERT INTO "ORDEN_PRODUCCION_DETALLE" ("ID_ORDEN_PRODUCCION", "ID_ITEM_CATALOGO_PRODUCTO", "CANTIDAD", "FECHA_MODIFICACION")
SELECT o."ID_ORDEN_PRODUCCION", (SELECT min("ID_ITEM_CATALOGO") FROM "ITEM_CATALOGO") + 100 + (o."ID_ORDEN_PRODUCCION" % 400), 10, now()
FROM "ORDEN_PRODUCCION" o;

INSERT INTO "ESTADO_STOCK" ("ID_ITEM_CATALOGO", "TIPO_STOCK", "STOCK_ACTUAL", "STOCK_ANTERIOR", "TIPO_MOVIMIENTO", "CANTIDAD_MOVIMIENTO", "ORIGEN_MOVIMIENTO", "ID_REFERENCIA_ORIGEN", "ID_REFERENCIA_DETALLE", "FECHA_ALTA")
SELECT x.id_item, x.tipo, 60, 50, x.mov, 10, 'PRODUCCION', x.id_orden, x.id_detalle, x.fecha
FROM (
  SELECT d."ID_ITEM_CATALOGO_PRODUCTO" id_item, 'PRODUCTO' tipo, 'INGRESO_PRODUCCION' mov, o."ID_ORDEN_PRODUCCION" id_orden, d."ID_ORDEN_PRODUCCION_DETALLE" id_detalle, o."FECHA_FIN" fecha
  FROM "ORDEN_PRODUCCION" o JOIN "ORDEN_PRODUCCION_DETALLE" d ON d."ID_ORDEN_PRODUCCION" = o."ID_ORDEN_PRODUCCION"
  WHERE o."ESTADO_PRODUCCION" = 'FINALIZADA'
  UNION ALL
  SELECT (SELECT min("ID_ITEM_CATALOGO") FROM "ITEM_CATALOGO") + (o."ID_ORDEN_PRODUCCION" % 100), 'INSUMO', 'EGRESO_PRODUCCION', o."ID_ORDEN_PRODUCCION", NULL, o."FECHA_INICIO"
  FROM "ORDEN_PRODUCCION" o WHERE o."ESTADO_PRODUCCION" = 'FINALIZADA'
) x
ORDER BY x.fecha;

-- Auditoria: alta de cada item y cliente, y cambios de precio en los productos.
INSERT INTO "AUDITORIA_CAMBIO" ("ENTIDAD", "ID_ENTIDAD", "ACCION", "CAMBIOS", "FECHA")
SELECT 'ITEM_CATALOGO', "ID_ITEM_CATALOGO", 'ALTA', jsonb_build_array(jsonb_build_object('campo', 'precio', 'antes', null, 'despues', "PRECIO"::text)), now() - interval '3 years'
FROM "ITEM_CATALOGO";
INSERT INTO "AUDITORIA_CAMBIO" ("ENTIDAD", "ID_ENTIDAD", "ACCION", "CAMBIOS", "FECHA")
SELECT 'CLIENTE', "ID_CLIENTE", 'ALTA', jsonb_build_array(jsonb_build_object('campo', 'nombre', 'antes', null, 'despues', "NOMBRE")), "FECHA_ALTA"
FROM "CLIENTE";
INSERT INTO "AUDITORIA_CAMBIO" ("ENTIDAD", "ID_ENTIDAD", "ACCION", "CAMBIOS", "FECHA")
SELECT 'ITEM_CATALOGO', i."ID_ITEM_CATALOGO", 'MODIFICACION',
  jsonb_build_array(jsonb_build_object('campo', CASE WHEN n % 3 = 0 THEN 'stockMinimo' ELSE 'precio' END, 'antes', '100', 'despues', '120')),
  now() - (n * interval '20 days')
FROM "ITEM_CATALOGO" i CROSS JOIN generate_series(1, 12) n
WHERE i."TIPO_ITEM" = 'PRODUCTO';

COMMIT;

ANALYZE;
