# Hito 13 — Inventario avanzado, fase 1

Fecha: 2026-07-12

## Objetivo

Mejorar la identificación y clasificación del catálogo sin introducir almacenes, sucursales o un ERP. La fase está orientada a localizar rápidamente una pieza por SKU, código de barras, categoría, marca o modelo compatible.

## Alcance

- Código de barras opcional y único entre productos activos.
- CRUD con archivado lógico de categorías.
- Compatibilidades de producto por marca y modelo.
- Búsqueda unificada por nombre, SKU, código, marca o modelo.
- Filtro por categoría.
- Vista operativa responsive para catálogo, categorías y compatibilidades.
- Auditoría de categorías y compatibilidades.
- Permisos backend: admin y manager administran; otros roles consultan.

## Modelo

- Se agregó `products.barcode` sin modificar snapshots históricos.
- Se agregó `product_compatibilities` con `business_id`, `product_id`, marca, modelo e índices por negocio/producto.
- La tabla existente `categories` se conserva para evitar una migración destructiva; el sistema sigue siendo single-business operativo.
- No se modifica stock al editar categorías, código o compatibilidades.

## Endpoints

- `GET /api/operations/categories`
- `POST /api/operations/categories`
- `PATCH /api/operations/categories/:id`
- `DELETE /api/operations/categories/:id`
- `GET /api/operations/products/:id/compatibilities`
- `POST /api/operations/products/:id/compatibilities`
- `DELETE /api/operations/product-compatibilities/:id`
- `GET /api/operations/products` amplía búsqueda y filtro `categoryId`.

## Migración

- `0009_overjoyed_moonstone.sql`

La migración es incremental. No renombra tablas ni cambia folios, stock, caja, ventas o reparaciones.

## No implementado en esta fase

- Múltiples almacenes o sucursales.
- Ubicaciones físicas por anaquel.
- Conteos cíclicos.
- Impresión de etiquetas.
- Importación CSV.
- Variantes complejas de producto.

Estos puntos quedan para una segunda fase después de validar el uso real de categorías, códigos y compatibilidades.
