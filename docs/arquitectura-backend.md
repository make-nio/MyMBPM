# Arquitectura Backend

## Principios del sistema

1. El stock solo se modifica desde `stock.service.ts`.
2. Toda operacion que impacte stock debe ejecutarse en transaccion.
3. Los services no acceden a Prisma directamente si existe repository.
4. Los controllers no contienen logica de negocio.
5. Las entidades criticas usan enums de dominio.

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

