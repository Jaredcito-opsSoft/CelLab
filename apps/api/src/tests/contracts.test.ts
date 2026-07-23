import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTableColumns } from 'drizzle-orm';
import {
  businessSettings,
  cashMovementMethod,
  layawayItems,
  layawayPayments,
  layaways,
  inventoryMovementType,
  paymentMethod,
  productCompatibilities,
  purchaseStatus,
  repairItems,
  repairStatus,
  saleItems,
  salePayments,
  saleReturnItems,
  saleReturnPayments,
  saleReturns,
  sales,
  userRole,
  warrantyClaimEvents,
  warrantyClaims,
} from '../db/schema.js';
import { isUserRole, roleGroups, userRoles } from '../lib/roles.js';
import {
  businessModuleKeys,
  businessModuleMap,
  businessModuleRegistry,
  isBusinessModuleKey,
} from '../modules/modules/modules.registry.js';

describe('contratos de roles', () => {
  it('mantiene roles únicos y alineados con PostgreSQL', () => {
    assert.equal(new Set(userRoles).size, userRoles.length);
    assert.deepEqual(userRole.enumValues, [...userRoles]);
    assert.equal(isUserRole('admin'), true);
    assert.equal(isUserRole('technician'), true);
    assert.equal(isUserRole('owner'), false);
  });

  it('solo usa roles válidos y conserva admin en todos los grupos', () => {
    for (const roles of Object.values(roleGroups)) {
      assert.equal(roles.includes('admin'), true);
      for (const role of roles) assert.equal(isUserRole(role), true);
    }
  });
});

describe('contratos de módulos configurables', () => {
  it('mantiene claves únicas y el mapa sincronizado', () => {
    assert.equal(new Set(businessModuleKeys).size, businessModuleKeys.length);
    assert.equal(businessModuleRegistry.length, businessModuleKeys.length);

    for (const key of businessModuleKeys) {
      assert.equal(isBusinessModuleKey(key), true);
      assert.equal(businessModuleMap.get(key)?.key, key);
    }
  });

  it('declara dependencias existentes y habilita los módulos núcleo', () => {
    for (const module of businessModuleRegistry) {
      if (module.isCore) assert.equal(module.defaultEnabled, true);
      for (const dependency of module.dependsOn ?? []) {
        assert.notEqual(dependency, module.key);
        assert.equal(businessModuleMap.has(dependency), true);
      }
    }
  });
});

describe('contratos operativos del esquema', () => {
  it('preserva enums usados por ventas, taller, compras e inventario', () => {
    assert.deepEqual(paymentMethod.enumValues, ['cash', 'transfer', 'card', 'mixed']);
    assert.deepEqual(cashMovementMethod.enumValues, ['cash', 'transfer', 'card', 'other']);
    assert.deepEqual(purchaseStatus.enumValues, ['draft', 'ordered', 'partially_received', 'received', 'cancelled']);
    assert.deepEqual(repairStatus.enumValues, ['received', 'diagnosis', 'awaiting_authorization', 'in_repair', 'testing', 'ready', 'delivered', 'cancelled']);
    assert.deepEqual(inventoryMovementType.enumValues, ['sale', 'sale_cancel', 'sale_return', 'stock_entry', 'manual_adjustment', 'service_usage', 'service_usage_void', 'purchase_receipt', 'layaway_reserve', 'layaway_release']);
  });

  it('preserva business_id y snapshots monetarios históricos', () => {
    const businessColumns = getTableColumns(businessSettings);
    const saleColumns = getTableColumns(sales);
    const saleItemColumns = getTableColumns(saleItems);
    const repairItemColumns = getTableColumns(repairItems);
    const advancedTables = [salePayments, saleReturns, saleReturnItems, saleReturnPayments, layaways, layawayItems, layawayPayments, productCompatibilities, warrantyClaims];

    assert.ok(businessColumns.currency);
    assert.ok(businessColumns.timezone);
    assert.ok(saleColumns.businessId);
    assert.ok(saleColumns.subtotalCents);
    assert.ok(saleColumns.discountCents);
    assert.ok(saleColumns.totalCents);
    assert.ok(saleItemColumns.businessId);
    assert.ok(saleItemColumns.productNameSnapshot);
    assert.ok(saleItemColumns.costCentsSnapshot);
    assert.ok(repairItemColumns.businessId);
    assert.ok(repairItemColumns.costCentsSnapshot);
    assert.ok(repairItemColumns.grossProfitCents);
    for (const table of advancedTables) assert.ok(getTableColumns(table).businessId);
    assert.ok(getTableColumns(warrantyClaimEvents).warrantyClaimId);
  });
});
