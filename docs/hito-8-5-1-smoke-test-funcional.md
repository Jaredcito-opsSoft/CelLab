# Smoke Test Funcional Real - Hito 8.5
**Fecha:** 28 de junio de 2026  
**Auditor:** Antigravity (AI Coding Assistant)  
**Proyecto:** LocalPOS / CelLab Tuxtla  
**Estado:** Hito 8.5 Completado y Validado al 100%  

---

## 1. Validaciones técnicas ejecutadas

Se realizaron todas las comprobaciones de compilación y tipado estático en el monorepo:
1. **Migraciones:** Aplicada con éxito la migración `0006_simple_genesis.sql` (`npm run db:migrate -w @cellab/api`).
2. **Typecheck API:** Exitoso (`npm run typecheck -w @cellab/api` -> 0 errores).
3. **Typecheck Web:** Exitoso (`npm run typecheck -w @cellab/web` -> 0 errores).
4. **Typecheck general:** Exitoso (`npm run typecheck` -> 0 errores).
5. **Build de producción:** Exitoso (`npm run build` -> Compilación completa del API y bundle de producción en React/Vite generado sin advertencias).

---

## 2. Checklist del Smoke Test Funcional Real

Se ejecutó una suite de pruebas de integración completa interactuando directamente contra el API HTTP (`http://localhost:3000`) y la base de datos PostgreSQL:

### A. Autenticación y Perfil Público
- [x] **Login Admin:** Autenticación correcta con credenciales de administrador de `.env` obteniendo token JWT.
- [x] **GET /api/public/business-profile:** Endpoint público responde con éxito. Retorna la configuración de `business_settings` (incluyendo `whatsappPhone` formateado automáticamente con prefijo `52` para enlaces de WhatsApp).
- [x] **Timezone:** Confirmado que el timezone del negocio está presente en `business_settings` (valor: `America/Mexico_City`) y se expone de forma segura.

### B. Política de Caja Abierta
- [x] **Caso A - Política Inactiva (`require_open_cash_for_money_operations = false`):**
  - Con todas las cajas cerradas, se intentó registrar una venta.
  - **Resultado esperado:** La venta fue creada con éxito, retornando la advertencia `cashWarning: "No hay caja abierta. La operación se registró, pero no quedó asociada a un corte de caja."`. No se creó ningún registro en `cash_movements`. **[PASADO]**
- [x] **Caso B - Política Activa (`require_open_cash_for_money_operations = true`):**
  - Con todas las cajas cerradas, se intentó registrar una venta.
  - **Resultado esperado:** Bloqueo inmediato del API con error `409` (`Abre caja antes de registrar operaciones con dinero.`). **[PASADO]**
  - Se procedió a abrir la caja con saldo inicial de $1000.00 (`/api/operations/cash/open`).
  - Se intentó registrar la venta nuevamente con la caja abierta.
  - **Resultado esperado:** Venta permitida con éxito, creando un movimiento de caja `in` de tipo `sale_payment` asociado al folio de la venta. **[PASADO]**

### C. Ventas e Integridad Histórica
- [x] **sale_items.cost_cents_snapshot:** Se verificó la base de datos tras la venta del Caso B y se confirmó que el costo de compra unitario (`cost_cents_snapshot`) se guardó correctamente en el ítem vendido, protegiendo el margen de variaciones de costo futuras.
- [x] **Cancelación con Caja Abierta:** Se canceló la venta creada.
  - **Resultado esperado:** Reversa de inventario y creación correcta de un movimiento de caja `out` de tipo `sale_cancel` por el total de la venta. **[PASADO]**
- [x] **Cancelación con Caja Cerrada:** Se cerró la caja activa y se intentó cancelar una venta previa que requiere egreso físico de dinero.
  - **Resultado esperado:** Bloqueo de la cancelación indicando que no se puede mutar una caja cerrada (error `409` exigiendo caja abierta). **[PASADO]**

### D. Reparaciones y Control de Saldos
- [x] **Creación y Total de Reparación:** Se creó una reparación para Samsung Galaxy S23 con anticipo de $200.00 (`depositCents: 20000`) y total cotizado definido de $1500.00 (`estimatedCents: 150000`).
- [x] **Pago menor o igual al saldo:** Se registró un pago parcial de $1000.00 (`amountCents: 100000`).
  - **Resultado esperado:** Pago permitido con éxito. Saldo restante: $300.00. **[PASADO]**
- [x] **Pago mayor al saldo:** Se intentó registrar un pago de $400.00.
  - **Resultado esperado:** Rechazado con código `400` (`El pago excede el saldo pendiente de la reparación.`). **[PASADO]**
- [x] **Anulación de pago:** Se anuló el pago de $1000.00 con la caja abierta.
  - **Resultado esperado:** Anulación correcta y generación automática del movimiento de caja de salida `out` de tipo `repair_payment_void`. **[PASADO]**

### E. Endurecimiento de Permisos (Técnicos)
- [x] **Creación de Técnico Temporal:** Se registró un usuario técnico y se obtuvo su token de sesión.
- [x] **Intentar borrar reparación:** Bloqueado con error `403 Forbidden`. **[PASADO]**
- [x] **Intentar borrar producto:** Bloqueado con error `403 Forbidden`. **[PASADO]**
- [x] **Intentar modificar costo/precio de producto (campos sensibles):** Se envió un `PATCH` a `/api/operations/products/:id` modificando `costCents`. Bloqueado con error `403 Forbidden`. **[PASADO]**
- [x] **Intentar abrir/cerrar caja:** Bloqueado con error `403 Forbidden`. **[PASADO]**

### F. Frontend y Enlaces Públicos
- [x] Se confirmó que los componentes públicos (Landing Page, Botón flotante de WhatsApp, Chatbot widget y Rastreador público de taller) leen los datos dinámicos desde `business_settings.phone` a través del profile API, eliminando de forma definitiva el número hardcodeado de CelLab (`9612858828`) en la lógica de negocio pública.

---

## 3. Registro de bugs y correcciones

### Bugs encontrados y corregidos en el Smoke Test
1. **Error de referencias en Cleanup:** El script de smoke test programático inicial falló durante la limpieza de datos debido a que faltaban las referencias de Drizzle `repairEvents` e `inventoryMovements` en el bloque de imports. 
   * **Corrección:** Se agregaron al listado de importaciones y la limpieza final del test database se completó al 100%.

### Bugs pendientes
- Ninguno. Todos los flujos y bloqueos lógicos requeridos por el Hito 8.5 funcionan de forma exacta.

---

## 4. Estado final del Hito 8.5
**Veredicto:** **CERRADO Y COMPLETAMENTE VERIFICADO.**  
La consistencia de caja, la protección histórica de costos, las políticas de bloqueo/advertencia de dinero en caja, el control estricto de saldo de reparaciones y el aislamiento de permisos del rol técnico cumplen con los estándares de robustez de un sistema POS listo para ambiente controlado de piloto.

---

## 5. Recomendación para el Hito 9 (Siguiente Fase)

Dado que las brechas funcionales de caja y ventas se han cerrado en el Hito 8.5, podemos avanzar con seguridad al **Hito 9: Roles, usuarios y limpieza de marca**.

**Objetivos del Hito 9:**
1. Crear el CRUD de usuarios y contraseñas completo en el panel administrativo (eliminando la dependencia de seeds).
2. Introducir el rol `staff` / `cajero` (un operador con permisos de venta pero bloqueado en anulación de ventas e inventario).
3. Cambiar los namespaces y JWT tokens emisores (`cellab-api`, `cellab-panel`) a esquemas genéricos configurables de `LocalPOS`.
4. Habilitar la parametrización dinámica del teléfono del negocio en el formulario de configuración.
