# LocalPOS — Auditoría de limpieza de datos para piloto

Fecha: 2026-07-25
Copia auditada: `localpos_restore_pristine`
Copia de ensayo: `localpos_cleanup_rehearsal`

## Estado de la copia

La copia pristine proviene del dump validado de Supabase, restaurado en PostgreSQL 17 y migrado localmente con 0014. No recibió smokes nuevos.

Estado inicial:

- 1 negocio.
- 36 usuarios.
- 17 productos.
- 16 clientes.
- 30 ventas.
- 10 reparaciones.
- 10 cajas.
- 1 sesión abierta.

## Seeds y smokes inspeccionados

- `apps/api/src/db/seed.ts`
- `apps/api/src/scripts/seed-demo.ts`
- `apps/api/src/scripts/smoke-permissions.ts`
- `apps/api/src/scripts/smoke-purchases.ts`
- `apps/api/src/scripts/smoke-pos-complete.ts`
- `apps/api/src/scripts/smoke-multi-register.ts`
- `apps/api/src/scripts/smoke-cash-concurrency.ts`
- `apps/api/src/scripts/smoke-warranty.ts`
- `apps/api/src/scripts/smoke-reports.ts`
- `apps/api/src/scripts/smoke-tenant-foundation.ts`
- `apps/api/src/tests/`
- Documentos históricos de los smokes 5.1.2 y 8.5.1.

## Valores exactos utilizados por pruebas

| Tipo | Valor o patrón exacto | Archivo/evidencia |
|---|---|---|
| Usuario | `smoke-(manager|staff|technician|viewer)-<runId>@example.com` | `smoke-permissions.ts` |
| Usuario | `smoke-purchases-staff-<runId>@example.com` | `smoke-purchases.ts` |
| Usuario | `smoke-reports-viewer-<runId>@example.com` | `smoke-reports.ts` |
| Usuario | `smoke-warranty-tech-<runId>@example.com` | `smoke-warranty.ts` |
| Usuario | `tenant-<caso>-<runId>@example.test` | `smoke-tenant-foundation.ts` |
| Producto | `COST-<runId>` | `smoke-permissions.ts` |
| Producto | `SMK-COM-<runId>` | `smoke-purchases.ts` |
| Producto | `POS-<runId>` | `smoke-pos-complete.ts` |
| Producto | `MULTI-<runId>` | `smoke-multi-register.ts` |
| Producto | `LOAD-<runId>` | `smoke-cash-concurrency.ts` |
| Producto | `88267ca7-eb61-4d5b-b523-b4416109e67f` / `SMOKE-1782439400843-A05` | Smoke histórico 5.1.2 |
| Cliente | `Smoke Cost <runId>` | `smoke-permissions.ts` |
| Cliente | `Cliente POS <runId>` | `smoke-pos-complete.ts` |
| Cliente | `Cliente garantía <runId>` | `smoke-warranty.ts` |
| Caja | `SMOKE-01`…`SMOKE-09` | Smokes multicaja/concurrencia |
| Proveedor | `Proveedor Smoke <runId>` | `smoke-purchases.ts` |
| Compra | Nota exacta `Compra smoke` | `smoke-purchases.ts` |
| Reparación | Marca/modelo `Smoke` / `Cost Guard` | `smoke-permissions.ts` |
| Venta | `0a7f0189-891b-478b-877a-0bbaef38f999` | Smoke histórico 5.1.2 |
| Reparación | `ba411be5-d805-4be2-8acf-b94c110a8773` | Smoke histórico 5.1.2 |

Los valores del seed demo (`DEMO-*`, usuarios `@demo.localpos.test`, clientes UUID `3000…`) no aparecieron en la copia.

## Usuarios candidatos

| Entidad | ID/conjunto | Clasificación | Evidencia | Acción propuesta |
|---|---|---|---|---|
| 33 usuarios | Emails exactos de smokes actuales | `CONFIRMADO_SMOKE` | Coincidencia con scripts vigentes | Eliminar membership, auditoría relacionada y usuario |
| Técnico inactivo | `0ebaa32c-fff0-4a6c-8159-d281b16e8028` | `PROBABLE_PRUEBA` | Nombre comienza con “Smoke”, correo enmascarado `s***@localpos.test`; no existe valor exacto en script vigente | Conservar hasta confirmación |
| Admin local | `d86667fa-bb01-4027-a83c-266cc959445e` | `DUDOSO` | Correo enmascarado `a***@localpos.test` | Conservar |
| Admin aceptado | `c6f0d352-0f5b-4793-80f0-932a58e56459` | `REAL` | Cuenta administrativa confirmada; correo enmascarado `j***@gmail.com` | Conservar |

## Productos candidatos

Confirmados y ensayados para eliminación:

| ID | SKU | Clasificación |
|---|---|---|
| `88267ca7-eb61-4d5b-b523-b4416109e67f` | `SMOKE-1782439400843-A05` | `CONFIRMADO_SMOKE` |
| `36e6658e-1950-4817-938c-c44779d90314` | `SMK-COM-1783370218821` | `CONFIRMADO_SMOKE` |
| `6b403aa4-eeff-40e6-b405-ef0d9d00df6b` | `SMK-COM-1783371009080` | `CONFIRMADO_SMOKE` |
| `921f9ac7-841a-4121-9860-f89fef10af20` | `SMK-COM-1783459201880` | `CONFIRMADO_SMOKE` |
| `ff72aa67-2237-45a8-9ec2-102ffe836cd2` | `SMK-COM-1783461033144` | `CONFIRMADO_SMOKE` |
| `ea694d8e-d464-4b1b-9094-3de6c49b4b55` | `SMK-COM-1783461933799` | `CONFIRMADO_SMOKE` |
| `cc222c3e-b481-47c3-95cd-70de5a5d8266` | `POS-1783912230317` | `CONFIRMADO_SMOKE` |
| `503d1d45-d9aa-4a00-b0ce-81711bfada92` | `MULTI-1783920370614` | `CONFIRMADO_SMOKE` |
| `87ff5a28-ce93-48df-ae1e-1cae288fd86b` | `LOAD-1783920840997` | `CONFIRMADO_SMOKE` |

Conservados por falta de origen exacto vigente:

- `SMOKE-1788880-A06`
- `SMOKE-18888-A07`
- `TST-1782707966678`
- `TST-1782708028020`
- `TST-1782708063187`
- `TST-1782708099257`
- `TST-1782708273213`
- `TST-1782708320108`

Clasificación: `PROBABLE_PRUEBA`. Requieren autorización explícita antes de eliminarlos.

## Clientes candidatos

Confirmados:

- Cliente asociado al smoke histórico `REP-00001`.
- Seis clientes `Smoke Cost <runId>`.
- Un cliente `Cliente POS <runId>`.

Total: 8 `CONFIRMADO_SMOKE`.

Conservados:

- Cinco clientes llamados “Cliente Smoke Test”: `PROBABLE_PRUEBA`.
- `Cliente Flujo 612261`: `PROBABLE_PRUEBA`.
- Dos clientes que no coinciden con scripts: `PROBABLE_REAL`; nombres y teléfonos permanecen enmascarados en esta auditoría.

## Ventas y caja candidatas

Se identificaron 15 ventas `CONFIRMADO_SMOKE` por relación directa con los nueve productos confirmados. Incluyen:

- `VTA-00001`, `VTA-00002`.
- `VTA-00021`–`VTA-00033` según sus partidas confirmadas.

Se conservaron otras 15 ventas ligadas a productos `TST/SMOKE` clasificados como `PROBABLE_PRUEBA`.

Cajas:

- `SMOKE-01`–`SMOKE-09`: `CONFIRMADO_SMOKE`.
- 11 sesiones y 25 movimientos ligados a esas cajas/entidades confirmadas.
- `CAJA-01`: caja principal activa/default, conservada.
- Existe una sesión abierta en `CAJA-01`.
- No existe `MAIN-01`.

## Reparaciones candidatas

Confirmadas:

- `REP-00001`, ID `ba411be5-d805-4be2-8acf-b94c110a8773`.
- `REP-00007`–`REP-00012`, marca/modelo `Smoke / Cost Guard`.

Total: 7 `CONFIRMADO_SMOKE`.

Conservadas:

- `REP-00002`, `REP-00003`: `PROBABLE_PRUEBA`.
- `REP-00006` (`Motorola / Smoke 612261`): `PROBABLE_PRUEBA`.

## Movimientos de inventario candidatos

Se identificaron 37 movimientos por relación exacta con productos, ventas, devoluciones, reparaciones, compras o apartados confirmados. Se eliminaron únicamente en la copia de ensayo.

Los movimientos asociados a productos `TST/SMOKE` dudosos se conservaron.

## Auditoría relacionada

Se identificaron 82 eventos por:

- actor usuario confirmado de smoke;
- `entity_id` de producto, cliente, reparación, venta, compra, proveedor o caja confirmada.

Se eliminaron junto con sus entidades en el ensayo. Los cambios de módulos ejecutados por un admin real no tienen run ID inequívoco y se conservaron.

## Datos dudosos

No se deben eliminar automáticamente:

- 8 productos `TST/SMOKE` históricos.
- 6 clientes probables de prueba.
- 15 ventas relacionadas.
- 3 reparaciones relacionadas.
- 1 técnico inactivo probable de prueba.
- Eventos de módulos sin identificador de corrida.
- Admin local `a***@localpos.test`.

## Dependencias y orden seguro de limpieza

1. Congelar operación y confirmar base/negocio.
2. Cerrar cualquier sesión de caja mediante flujo operativo.
3. Crear tablas temporales con IDs exactos aprobados.
4. Eliminar auditoría vinculada.
5. Eliminar eventos/reclamos de garantía.
6. Eliminar movimientos de caja e inventario.
7. Eliminar devoluciones, pagos e items.
8. Eliminar ventas.
9. Eliminar pagos/items/apartados.
10. Eliminar items/compras/proveedores.
11. Eliminar pagos/items/eventos/reparaciones.
12. Eliminar compatibilidades/productos.
13. Eliminar clientes.
14. Eliminar sesiones/cajas smoke.
15. Eliminar memberships/usuarios smoke.
16. Validar admins, settings, módulos, caja, ledger y API antes de commit.

## Estado esperado del piloto

Objetivo pendiente de aprobación:

- 1 negocio.
- 2–3 usuarios reales y al menos un admin activo.
- Caja principal única, activa/default.
- 0 sesiones abiertas antes del inicio.
- 0 productos/clientes/ventas/movimientos smoke.
- `core_pos`, `cash`, `inventory_basic` activos.
- Módulos avanzados desactivados salvo necesidad confirmada.

La copia ensayada todavía no cumple ese estado porque se conservaron datos probables/dudosos, existe una sesión abierta, la caja es `CAJA-01` y varios módulos avanzados permanecen activos.

## Decisión posterior del propietario

El 2026-07-25 el propietario confirmó que no existe operación real relevante y autorizó clasificar como `PRUEBA` todos los datos actuales, salvo la cuenta administrativa real `c6f0d352-0f5b-4793-80f0-932a58e56459`.

La clasificación final enmascarada está en `docs/localpos-pilot-ambiguous-data-review.md`. La limpieza remota sigue separada y no se ejecutó durante la aplicación de 0014.
