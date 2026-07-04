# Hito 8 — Corte de caja y control operativo

Fecha: 2026-06-28  
Producto: LocalPOS / CelLab Tuxtla

## 1. Objetivo

Implementar un módulo de corte de caja útil para operación diaria de negocios pequeños/intermedios, manteniendo LocalPOS como producto vendible y CelLab Tuxtla como negocio piloto.

El módulo responde preguntas operativas clave:

- ¿Con cuánto efectivo abrí caja
- ¿Cuánto cobré por efectivo, transferencia, tarjeta u otro método
- ¿Qué salió de caja
- ¿Cuánto efectivo debería tener físicamente
- ¿Cuánto conté realmente
- ¿Hubo sobrante o faltante
- ¿Quién abrió y cerró caja
- ¿Qué movimientos tuvo el turno

## 2. Tablas agregadas

### `cash_sessions`

Representa una caja/turno/corte.

Campos principales:

- `id`
- `business_id`
- `opened_by_user_id`
- `closed_by_user_id`
- `opened_at`
- `closed_at`
- `opening_cash_cents`
- `expected_cash_cents`
- `counted_cash_cents`
- `difference_cents`
- `status`: `open` / `closed`
- `notes`
- `created_at`
- `updated_at`

Regla importante:

- índice único parcial para permitir solo una caja abierta por negocio.

### `cash_movements`

Registra movimientos trazables de caja.

Campos principales:

- `id`
- `business_id`
- `cash_session_id`
- `type`
- `method`
- `amount_cents`
- `direction`: `in` / `out`
- `reference_type`
- `reference_id`
- `reference_folio`
- `reason`
- `note`
- `created_by_user_id`
- `created_at`
- `voided_at`
- `voided_by_user_id`
- `void_reason`

Tipos implementados:

- `opening_cash`
- `sale_payment`
- `repair_payment`
- `manual_in`
- `manual_out`
- `sale_cancel`
- `repair_payment_void`
- `adjustment`

Métodos implementados:

- `cash`
- `transfer`
- `card`
- `other`

## 3. Migración creada

- `apps/api/drizzle/0005_ancient_cassandra_nova.sql`

La migración fue aplicada correctamente con:

```powershell
npm run db:migrate -w @cellab/api
```

## 4. Endpoints nuevos

Base:

- `/api/operations/cash`

Endpoints:

- `GET /api/operations/cash/current`
- `POST /api/operations/cash/open`
- `POST /api/operations/cash/manual-movement`
- `POST /api/operations/cash/close`
- `GET /api/operations/cash/sessionsfrom=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/operations/cash/sessions/:id`
- `GET /api/operations/cash/summaryrange=today|week|month`

## 5. Reglas de negocio

- Solo puede haber una caja abierta por negocio.
- Solo admin puede abrir caja.
- Solo admin puede cerrar caja.
- Solo admin puede registrar movimientos manuales por ahora.
- Caja cerrada no recibe movimientos nuevos.
- No se borran movimientos de caja.
- Toda corrección futura debe hacerse como movimiento/anulación trazable.
- El dinero se maneja en centavos.
- Abrir caja con $0 es válido; no se crea movimiento `opening_cash` si el monto es cero para respetar el check `amount_cents > 0`.

## 6. Integración con ventas

Al crear venta POS-lite con caja abierta:

- crea `cash_movement` tipo `sale_payment`;
- dirección `in`;
- método igual al método de pago de la venta;
- referencia a venta y folio `VTA-*`.

Al cancelar venta con caja abierta:

- crea `cash_movement` tipo `sale_cancel`;
- dirección `out`;
- conserva referencia a venta y folio;
- no borra el movimiento original.

Si no hay caja abierta:

- la venta no se bloquea.
- no se crea movimiento de caja.

## 7. Integración con pagos de reparación

Al registrar pago de reparación con caja abierta:

- crea `cash_movement` tipo `repair_payment`;
- dirección `in`;
- método igual al pago;
- referencia a reparación y folio `REP-*`.

Al anular pago de reparación con caja abierta:

- crea `cash_movement` tipo `repair_payment_void`;
- dirección `out`;
- no borra el pago original.

Los anticipos iniciales al crear reparación también se reflejan en caja si hay caja abierta.

## 8. Cálculos de caja

Efectivo esperado:

```text
movimientos cash direction in - movimientos cash direction out
```

Incluye:

- apertura en efectivo si aplica;
- ventas en efectivo;
- pagos de reparación en efectivo;
- entradas manuales en efectivo;
- salidas manuales en efectivo;
- cancelaciones/anulaciones en efectivo.

Diferencia:

```text
efectivo contado - efectivo esperado
```

Interpretación:

- `0`: caja cuadrada.
- `> 0`: sobrante.
- `< 0`: faltante.

Transferencia, tarjeta y otros métodos se muestran separados porque no forman parte del efectivo físico.

## 9. Frontend

Ruta nueva:

- `/panel/caja`

La vista incluye:

- apertura de caja;
- estado de caja abierta;
- KPIs de efectivo esperado, total cobrado, transferencia, tarjeta y salidas;
- registro de entrada/salida manual;
- cierre de caja;
- movimientos del turno;
- historial de cortes;
- resumen hoy/semana/mes;
- vista imprimible del corte.

## 10. Permisos

Admin:

- abrir caja;
- cerrar caja;
- registrar entradas/salidas;
- ver cortes;
- imprimir corte;
- ver reportes de caja.

Technician:

- puede consultar estado de caja desde UI si tiene acceso al panel;
- backend rechaza abrir/cerrar caja y movimientos manuales.

## 11. Smoke test ejecutado

Smoke test funcional controlado contra API local/build y Supabase:

- `/health`: OK.
- login admin: OK.
- abrir caja con $500: OK.
- intentar abrir segunda caja: rechazado correctamente.
- registrar entrada manual: OK.
- registrar salida manual: OK.
- venta efectivo: OK.
- cancelación venta efectivo: OK.
- venta transferencia: OK.
- cancelación venta transferencia: OK.
- pago de reparación efectivo: OK.
- anulación de pago reparación: OK.
- cierre con efectivo contado igual al esperado: OK, diferencia `0`.
- resumen hoy: OK.
- resumen semana: OK.
- resumen mes: OK.
- historial de cortes: OK.
- intento de abrir caja con token `technician`: rechazado correctamente.

Resultado del smoke:

```json
{
  "health": true,
  "login": true,
  "opened": true,
  "duplicateOpenRejected": true,
  "manualIn": true,
  "manualOut": true,
  "saleCash": true,
  "saleTransfer": true,
  "repairPayment": true,
  "close": true,
  "summaries": true,
  "sessions": true,
  "technicianRejected": true,
  "skipped": []
}
```

## 12. Validaciones ejecutadas

- `npm run typecheck -w @cellab/api`: aprobado.
- `npm run typecheck -w @cellab/web`: aprobado.
- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- `npm run db:migrate -w @cellab/api`: aprobado.

## 13. Pendientes recomendados

- Hito 8.5: micro-ajustes visuales/responsive del panel de caja.
- Hito 9: reorganización UI/UX senior del panel completo para clarificar Núcleo LocalPOS vs módulos opcionales.
- Futuro: anulación de movimientos manuales con motivo desde UI.
- Futuro: roles configurables tipo `staff`.
- Futuro: exportación CSV/PDF de cortes.