# MVP operativo — puesta en marcha

Este corte reemplaza los datos simulados del futuro panel por una capa operativa real:

- acceso de taller con JWT, contraseñas BCrypt y límite de intentos;
- roles `admin` y `technician`;
- PostgreSQL con Drizzle y migración versionada;
- CRUD con borrado lógico para clientes y productos;
- recepción de reparaciones con folios `REP-00001` generados dentro de una transacción;
- historial de cambios de estado de cada reparación;
- panel protegido en `/panel`.

## Arranque local

1. Copia `.env.example` a `.env` y reemplaza `DATABASE_URL` y `JWT_SECRET`.
2. Usa una contraseña de al menos 10 caracteres en `ADMIN_PASSWORD`.
3. Ejecuta:

```bash
pnpm --filter @cellab/api db:migrate
pnpm --filter @cellab/api db:seed
pnpm dev
```

La landing continúa en `http://localhost:5173/` y el panel en
`http://localhost:5173/panel`.

## Decisiones de integridad

Los importes se guardan en centavos para evitar errores de punto flotante.
El contador de folios se actualiza en la misma transacción que crea la orden.
Clientes, productos y reparaciones se archivan; no se borran físicamente.
Las mutaciones críticas sólo existen en la API protegida.

## Próximo hito

Venta rápida `VTA-00001`, movimientos de inventario, descuento de stock
transaccional, pagos y nota imprimible de reparación.
