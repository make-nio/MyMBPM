# Propuestas para decidir con Maxi

Cuatro temas que dependen de cómo trabaja Maxi y que no se construyen hasta que él decida.
Cada documento explica qué hay hoy, las opciones con su impacto en el sistema y una
recomendación, y **termina con la pregunta exacta para Maxi**. Con la respuesta, la
implementación queda definida: no hay que volver a diseñar.

| Tema | Pregunta para Maxi |
| --- | --- |
| [Cobros con monto](cobros-con-monto.md) | Cuando un cliente te seña o te paga, ¿querés anotar cuánto y cómo pagó (efectivo, transferencia, Mercado Pago...), para ver cuánto te deben de cada pedido? |
| [Devolver el stock al cancelar](stock-al-cancelar.md) | Cuando se cancela un pedido que ya descontó stock, ¿los productos vuelven siempre al stock, o preferís que el sistema te pregunte cada vez? |
| [Trabajo a medida](trabajo-a-medida.md) | Cuando hacés algo a medida, ¿te alcanza con cargarlo como "Trabajo a medida" con una descripción y el precio que le pongas, o querés que cada encargo quede como un producto propio con su receta? |
| [Venta online](venta-online.md) | ¿Querés que los clientes vean tus productos en una página pública? Y si sí: ¿solo para mirar, para ver precios y pedirte presupuesto, o para comprar con carrito? |

Convenciones de todas las propuestas: migraciones **aditivas** (los deploy previews usan la base
de producción sin migrar), el stock solo lo mueve `stock.service.ts` en transacción y con
idempotencia, y cada cambio va en un PR con sus pruebas y su E2E.
