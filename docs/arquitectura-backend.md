# Arquitectura Backend

## Principios del sistema

1. El stock solo se modifica desde `stock.service.ts`.
2. Toda operacion que impacte stock debe ejecutarse en transaccion.
3. Los services no acceden a Prisma directamente si existe repository.
4. Los controllers no contienen logica de negocio.
5. Las entidades criticas usan enums de dominio.
