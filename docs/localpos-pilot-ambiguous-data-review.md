# LocalPOS — Revisión de datos para el piloto

Fecha: 2026-07-25

## Decisión del propietario

El propietario confirmó que no existe operación real relevante y clasificó como `PRUEBA` todos los datos actuales, excepto la cuenta administrativa real configurada en el entorno.

Cuenta protegida:

- ID: `c6f0d352-0f5b-4793-80f0-932a58e56459`.
- Correo enmascarado: `j***@gmail.com`.
- Rol: `admin`.
- Activa y coincidente con `ADMIN_EMAIL`.
- Clasificación: `REAL`.

No se incluye el correo completo ni ninguna credencial.

## Usuarios anteriormente dudosos

| ID corto | Identidad enmascarada | Rol | Activo | Clasificación |
|---|---|---|---:|---|
| `0ebaa32c` | `s***@localpos.test` | technician | No | PRUEBA |
| `d86667fa` | `a***@localpos.test` | admin | Sí | PRUEBA |

Los otros 33 usuarios ya eran `CONFIRMADO_SMOKE`. La limpieza conservará exclusivamente el administrador protegido.

## Productos anteriormente dudosos

| ID corto | Nombre | SKU | Stock | Movimientos | Ventas | Clasificación |
|---|---|---|---:|---:|---:|---|
| `a453dfd2` | Display A06 | `SMOKE-1788880-A06` | 9 | 2 | 1 | PRUEBA |
| `87a91edd` | Display A07 | `SMOKE-18888-A07` | 1 | 11 | 2 | PRUEBA |
| `910788bf` | Producto de Prueba Smoke Test | `TST-1782707966678` | 9 | 1 | 1 | PRUEBA |
| `019ff8ab` | Producto de Prueba Smoke Test | `TST-1782708028020` | 8 | 2 | 2 | PRUEBA |
| `d64a325b` | Producto de Prueba Smoke Test | `TST-1782708063187` | 9 | 1 | 1 | PRUEBA |
| `858391e3` | Producto de Prueba Smoke Test | `TST-1782708099257` | 7 | 5 | 4 | PRUEBA |
| `ea6fe79b` | Producto de Prueba Smoke Test | `TST-1782708273213` | 8 | 4 | 3 | PRUEBA |
| `cfa8c8a8` | Producto de Prueba Smoke Test | `TST-1782708320108` | 8 | 4 | 3 | PRUEBA |

Los otros nueve productos ya eran `CONFIRMADO_SMOKE`. Estado esperado: cero productos.

## Clientes anteriormente dudosos

| ID corto | Identidad enmascarada | Actividad | Clasificación |
|---|---|---|---|
| `a5b4cbf7` | `C*** / 96******10` | 1 reparación | PRUEBA |
| `4cfe0a82` | `S*** / 55******95` | 1 reparación | PRUEBA |
| `2e773d87` | `S*** / 55******50` | 1 reparación | PRUEBA |
| `1517374b` | `S*** / 55******09` | 1 reparación | PRUEBA |
| `7d3b5105` | `S*** / 55******43` | 1 reparación | PRUEBA |
| `6fbbc0c9` | `S*** / 55******05` | 1 reparación | PRUEBA |
| `a34934d9` | `S*** / 55******04` | 1 reparación | PRUEBA |
| `ec3f0110` | `J*** / 96******28` | 1 venta | PRUEBA |
| `5dc966a6` | `P*** / 96******36` | 1 venta | PRUEBA |

El propietario autorizó eliminar los 16 clientes actuales.

## Ventas anteriormente dudosas

| Folio | Total | Estado | Producto | Clasificación |
|---|---:|---|---|---|
| `VTA-00003`–`VTA-00004` | $200.00 c/u | Canceladas | Display A07 | PRUEBA |
| `VTA-00005`–`VTA-00015` | $30.00 c/u | Mixto | Producto de Prueba Smoke Test | PRUEBA |
| `VTA-00019` | $30.00 | Completada | Producto de Prueba Smoke Test | PRUEBA |
| `VTA-00020` | $610.00 | Completada | Productos TST y Display A06 | PRUEBA |

Las otras 15 ventas ya eran `CONFIRMADO_SMOKE`. Estado esperado: cero ventas.

## Reparaciones anteriormente dudosas

| Folio | Equipo | Estado | Clasificación |
|---|---|---|---|
| `REP-00002` | Samsung Galaxy S23 | Recibido | PRUEBA |
| `REP-00003` | Samsung Galaxy S23 | Esperando autorización | PRUEBA |
| `REP-00006` | Motorola Smoke 612261 | Recibido | PRUEBA |

Las otras siete reparaciones ya eran `CONFIRMADO_SMOKE`. Estado esperado: cero reparaciones.

## Conclusión

No permanecen datos con clasificación `PENDIENTE`. La autorización permite preparar una limpieza integral, conservando negocio, configuración, ledger, cuenta administrativa protegida y su membership.
