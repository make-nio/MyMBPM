# Respaldos de la base

Un respaldo **lógico** diario de todas las tablas de negocio, guardado en Netlify Blobs. Complementa
la restauración por punto en el tiempo de Neon: el respaldo es una copia fuera de Neon, se descarga y
se puede abrir en cualquier Postgres.

## Qué corre y cuándo

| Pieza | Archivo |
| --- | --- |
| Scheduled Function (todos los días a las 07:00 UTC = 04:00 en Argentina) | `apps/api/netlify/functions/respaldo-diario.ts` |
| Respaldar, guardar y rotar | `apps/api/src/respaldo/respaldo-diario.ts`, `almacen.ts` |
| Generar y restaurar | `apps/api/src/respaldo/respaldo.ts` |
| Qué tablas entran | `apps/api/src/respaldo/tablas.ts` |
| Scripts a mano | `apps/api/scripts/respaldo.ts` |

- Netlify programa la function **sólo en el deploy de producción publicado**. Los deploy previews
  no respaldan.
- Cada respaldo se guarda en el store de Blobs `respaldos` con la clave
  `respaldo-AAAA-MM-DDTHH-MM-SSZ.ndjson.gz`. Después de guardar el nuevo se borran los más viejos y
  quedan **los últimos 14**. Si el respaldo falla, no se borra ninguno.
- El log de la function y la metadata del blob registran el tamaño (comprimido y sin comprimir), la
  última migración y las filas de cada tabla.

## Qué contiene

Un archivo de texto comprimido con gzip, con una línea JSON por parte:

1. **Manifiesto**: formato y versión, fecha, **última migración aplicada**, tablas con su cantidad
   de filas y columnas omitidas.
2. Una línea por tabla: `{"tabla": "PEDIDO", "filas": [...]}`, con los nombres de columna de la base.

- Entran **todas las tablas de negocio**, incluidos los usuarios, porque auditoría, stock y pedidos
  los referencian.
- Del usuario **no se guarda `CLAVE_HASH`**: las claves no salen de producción.
- **`INTENTO_LOGIN` y `USUARIO_SESION` (cortes de sesion) quedan afuera**: son de vida corta y una
  base restaurada arranca sin sesiones.
- Todas las tablas se leen en una misma foto de la base (transacción `REPEATABLE READ`).
- Si una migración suma una tabla, el respaldo **falla** hasta que se la agregue en `tablas.ts`, en
  el orden correcto, o en las excluidas. Así ninguna tabla queda sin respaldar sin que nadie se entere.
- El repositorio es público: **nunca** se commitea un respaldo (`*.ndjson.gz` está en `.gitignore`).

Tamaño de referencia: la base local de los E2E (unas 18.000 filas) da **401 KB** comprimido
(7,1 MB sin comprimir). El tamaño real de producción queda en el log de la primera corrida.

## Descargar un respaldo

Con la [CLI de Netlify](https://docs.netlify.com/cli/get-started/), logueado y con el sitio
vinculado:

```bash
netlify blobs:list respaldos
netlify blobs:get respaldos respaldo-2026-09-24T07-00-00Z.ndjson.gz --output respaldo.ndjson.gz
```

También se puede hacer un respaldo a mano de cualquier base (sólo lee):

```bash
npm run respaldo:respaldar --workspace @myfirstproject/api -- --base "<url>" --archivo respaldo.ndjson.gz
```

## Restaurar en una base local

El script **sólo acepta una base local** (`localhost` / `127.0.0.1`) y **vacía**. La base tiene que
estar migrada **hasta la misma migración del respaldo** (la dice el manifiesto). Si no, no restaura.

```bash
# 1. Base vacia, migrada hasta la version del respaldo (hacer checkout del commit que la trae si hace falta).
createdb mymbpm_restaurada
NETLIFY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mymbpm_restaurada \
NETLIFY_DATABASE_URL_UNPOOLED=postgresql://postgres:postgres@localhost:5432/mymbpm_restaurada \
  npm run prisma:migrate:deploy --workspace @myfirstproject/api

# 2. Restaurar (todo en una transaccion: si falla, la base queda vacia).
#    --habilitar le pone la clave de CLAVE_NUEVA a ese usuario, para poder entrar con la copia.
CLAVE_NUEVA='una-clave-local' npm run respaldo:restaurar --workspace @myfirstproject/api -- \
  --base postgresql://postgres:postgres@localhost:5432/mymbpm_restaurada \
  --archivo respaldo.ndjson.gz --habilitar admin
```

La restauración inserta las tablas en orden de dependencias y compara las filas contra el
manifiesto. También deja las secuencias después del último id. Los usuarios quedan con una clave
inhabilitada (ningún ingreso coincide): hay que habilitarlos con `--habilitar` o, ya adentro, desde
Usuarios con "Clave nueva".

## Restaurar en producción (Neon)

**Lo decide Mariano en el momento.** Ningún script lo hace solo, a propósito. Primero conviene
evaluar la restauración por punto en el tiempo de Neon, que no pierde nada de lo cargado hasta ese
momento. Si hace falta este respaldo:

1. Restaurarlo en una base **local** como arriba y revisar que esté bien: entrar, mirar pedidos y
   stock.
2. En Neon, crear una **branch nueva vacía** (no pisar la principal), migrarla hasta la misma versión
   con `prisma migrate deploy` y copiar los datos desde la local:

   ```bash
   pg_dump --data-only --exclude-table=_prisma_migrations --exclude-table='"INTENTO_LOGIN"' --exclude-table='"USUARIO_SESION"' \
     "postgresql://postgres:postgres@localhost:5432/mymbpm_restaurada" > datos.sql
   psql "<url directa de la branch nueva>" --single-transaction -f datos.sql
   ```

3. Probar el sitio contra esa branch y, si está bien, pasarla a principal desde Neon (o apuntar
   `NETLIFY_DATABASE_URL` a ella). Las claves de los usuarios hay que volver a darlas.

## Prueba del ciclo completo

`npm run respaldo:probar-ciclo --workspace @myfirstproject/api -- --base <url local>` hace el ciclo
entero:

1. Crea una base vacía `<base>_restaurada` y la migra.
2. Respalda la base indicada y restaura el respaldo en la nueva.
3. Compara tabla por tabla la **cantidad de filas y una huella md5 del contenido** (sin la clave).
4. Verifica que la copia no tenga claves y que las secuencias sigan después del último id.
5. Borra la base temporal.

El CI lo corre en cada PR con la base que dejan los E2E.
