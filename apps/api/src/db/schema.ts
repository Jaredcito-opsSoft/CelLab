import { relations, sql } from 'drizzle-orm';
import { boolean, check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'manager', 'staff', 'technician', 'viewer']);
export const businessStatus = pgEnum('business_status', ['active', 'inactive']);
export const repairStatus = pgEnum('repair_status', ['received', 'diagnosis', 'awaiting_authorization', 'in_repair', 'testing', 'ready', 'delivered', 'cancelled']);
export const paymentMethod = pgEnum('payment_method', ['cash', 'transfer', 'card', 'mixed']);
export const saleStatus = pgEnum('sale_status', ['completed', 'partially_refunded', 'refunded', 'cancelled']);
export const inventoryMovementType = pgEnum('inventory_movement_type', ['sale', 'sale_cancel', 'sale_return', 'stock_entry', 'manual_adjustment', 'service_usage', 'service_usage_void', 'purchase_receipt', 'layaway_reserve', 'layaway_release']);
export const inventoryReferenceType = pgEnum('inventory_reference_type', ['sale', 'sale_return', 'layaway', 'product', 'repair', 'manual', 'purchase']);
export const cashSessionStatus = pgEnum('cash_session_status', ['open', 'closed']);
export const cashMovementType = pgEnum('cash_movement_type', ['opening_cash', 'sale_payment', 'sale_refund', 'repair_payment', 'manual_in', 'manual_out', 'sale_cancel', 'repair_payment_void', 'layaway_payment', 'layaway_payment_void', 'adjustment']);
export const cashMovementDirection = pgEnum('cash_movement_direction', ['in', 'out']);
export const cashMovementMethod = pgEnum('cash_movement_method', ['cash', 'transfer', 'card', 'other']);
export const purchaseStatus = pgEnum('purchase_status', ['draft', 'ordered', 'partially_received', 'received', 'cancelled']);
export const warrantyClaimStatus = pgEnum('warranty_claim_status', ['opened', 'under_review', 'approved', 'rejected', 'in_progress', 'resolved', 'closed', 'cancelled']);
export const saleReturnStatus = pgEnum('sale_return_status', ['completed', 'cancelled']);
export const layawayStatus = pgEnum('layaway_status', ['open', 'paid', 'delivered', 'cancelled', 'expired']);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const businesses = pgTable('businesses', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  status: businessStatus('status').default('active').notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('businesses_slug_idx').on(t.slug),
  index('businesses_status_idx').on(t.status),
]);

export const businessSettings = pgTable('business_settings', {
  id: uuid('id').primaryKey().references(() => businesses.id, { onDelete: 'restrict' }),
  businessName: varchar('business_name', { length: 160 }).notNull(),
  businessType: varchar('business_type', { length: 160 }).notNull(),
  logoUrl: text('logo_url'),
  phone: varchar('phone', { length: 30 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  ticketMessage: text('ticket_message'),
  warrantyMessage: text('warranty_message'),
  currency: varchar('currency', { length: 3 }).default('MXN').notNull(),
  primaryColor: varchar('primary_color', { length: 7 }).default('#0A84FF').notNull(),
  requireOpenCashForMoneyOperations: boolean('require_open_cash_for_money_operations').default(false).notNull(),
  timezone: text('timezone').default('America/Mexico_City').notNull(),
  ...timestamps,
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 180 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').default('technician').notNull(),
  active: boolean('active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex('users_email_idx').on(t.email)]);

export const businessMemberships = pgTable('business_memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  role: userRole('role').notNull(),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('business_memberships_business_user_idx').on(t.businessId, t.userId),
  index('business_memberships_user_id_idx').on(t.userId),
  index('business_memberships_business_id_idx').on(t.businessId),
  index('business_memberships_user_active_idx').on(t.userId, t.active),
]);

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorEmail: varchar('actor_email', { length: 180 }),
  actorRole: userRole('actor_role'),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 80 }).notNull(),
  entityId: varchar('entity_id', { length: 80 }),
  summary: text('summary'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('audit_logs_actor_user_id_idx').on(t.actorUserId),
  index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  index('audit_logs_action_idx').on(t.action),
  index('audit_logs_created_at_idx').on(t.createdAt),
]);

export const businessModules = pgTable('business_modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'cascade' }),
  moduleKey: varchar('module_key', { length: 80 }).notNull(),
  enabled: boolean('enabled').default(false).notNull(),
  configuredByUserId: uuid('configured_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, (t) => [
  index('business_modules_business_id_idx').on(t.businessId),
  index('business_modules_module_key_idx').on(t.moduleKey),
  uniqueIndex('business_modules_business_key_idx').on(t.businessId, t.moduleKey),
]);

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 140 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 180 }),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [uniqueIndex('clients_phone_active_idx').on(t.phone).where(sql`${t.deletedAt} is null`)]);

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  active: boolean('active').default(true).notNull(),
  ...timestamps,
}, (t) => [uniqueIndex('categories_name_idx').on(t.name)]);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 50 }).notNull(),
  barcode: varchar('barcode', { length: 80 }),
  name: varchar('name', { length: 160 }).notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  costCents: integer('cost_cents').default(0).notNull(),
  priceCents: integer('price_cents').notNull(),
  stock: integer('stock').default(0).notNull(),
  minimumStock: integer('minimum_stock').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex('products_sku_idx').on(t.sku),
  uniqueIndex('products_barcode_active_idx').on(t.barcode).where(sql`${t.barcode} is not null and ${t.deletedAt} is null`),
  index('products_category_id_idx').on(t.categoryId),
]);

export const productCompatibilities = pgTable('product_compatibilities', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  brand: varchar('brand', { length: 80 }).notNull(),
  model: varchar('model', { length: 120 }).notNull(),
  ...timestamps,
}, (t) => [
  index('product_compatibilities_business_idx').on(t.businessId),
  index('product_compatibilities_product_idx').on(t.productId),
  uniqueIndex('product_compatibilities_unique_idx').on(t.businessId, t.productId, t.brand, t.model),
]);

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 160 }).notNull(),
  contactName: varchar('contact_name', { length: 140 }),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 180 }),
  notes: text('notes'),
  active: boolean('active').default(true).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  index('suppliers_name_idx').on(t.name),
  uniqueIndex('suppliers_name_active_idx').on(t.name).where(sql`${t.deletedAt} is null`),
]);

export const folioCounters = pgTable('folio_counters', {
  scope: varchar('scope', { length: 30 }).primaryKey(),
  value: integer('value').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const repairs = pgTable('repairs', {
  id: uuid('id').defaultRandom().primaryKey(),
  folio: varchar('folio', { length: 24 }).notNull(),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  status: repairStatus('status').default('received').notNull(),
  brand: varchar('brand', { length: 80 }).notNull(),
  model: varchar('model', { length: 120 }).notNull(),
  deviceColor: varchar('device_color', { length: 80 }),
  serialNumber: varchar('serial_number', { length: 120 }),
  accessoriesReceived: text('accessories_received'),
  reportedIssue: text('reported_issue').notNull(),
  physicalCondition: text('physical_condition').notNull(),
  diagnosis: text('diagnosis'),
  publicNotes: text('public_notes'),
  internalNotes: text('internal_notes'),
  depositCents: integer('deposit_cents').default(0).notNull(),
  estimatedCents: integer('estimated_cents'),
  finalCents: integer('final_cents'),
  quoteStatus: varchar('quote_status', { length: 30 }).default('pending').notNull(),
  authorizedAt: timestamp('authorized_at', { withTimezone: true }),
  warrantyDays: integer('warranty_days').default(0).notNull(),
  warrantyUntil: timestamp('warranty_until', { withTimezone: true }),
  warrantyNotes: text('warranty_notes'),
  trackingEnabled: boolean('tracking_enabled').default(true).notNull(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex('repairs_folio_idx').on(t.folio),
  index('repairs_status_idx').on(t.status),
  index('repairs_client_id_idx').on(t.clientId),
  index('repairs_created_at_idx').on(t.createdAt),
  check('repairs_deposit_nonnegative', sql`${t.depositCents} >= 0`),
  check('repairs_estimated_nonnegative', sql`${t.estimatedCents} is null or ${t.estimatedCents} >= 0`),
  check('repairs_final_nonnegative', sql`${t.finalCents} is null or ${t.finalCents} >= 0`),
  check('repairs_warranty_days_nonnegative', sql`${t.warrantyDays} >= 0`),
  check('repairs_quote_status_valid', sql`${t.quoteStatus} in ('pending','quoted','authorized','rejected')`),
]);

export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'restrict' }),
  repairId: uuid('repair_id').references(() => repairs.id, { onDelete: 'set null' }),
  folio: varchar('folio', { length: 24 }).notNull(),
  status: purchaseStatus('status').default('draft').notNull(),
  expectedAt: timestamp('expected_at', { withTimezone: true }),
  notes: text('notes'),
  subtotalCents: integer('subtotal_cents').default(0).notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id),
  ...timestamps,
}, (t) => [
  uniqueIndex('purchases_folio_idx').on(t.folio),
  index('purchases_business_id_idx').on(t.businessId),
  index('purchases_supplier_id_idx').on(t.supplierId),
  index('purchases_repair_id_idx').on(t.repairId),
  index('purchases_status_idx').on(t.status),
  check('purchases_subtotal_nonnegative', sql`${t.subtotalCents} >= 0`),
]);

export const purchaseItems = pgTable('purchase_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  purchaseId: uuid('purchase_id').notNull().references(() => purchases.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  receivedQuantity: integer('received_quantity').default(0).notNull(),
  unitCostCents: integer('unit_cost_cents').default(0).notNull(),
  totalCents: integer('total_cents').default(0).notNull(),
  ...timestamps,
}, (t) => [
  index('purchase_items_purchase_id_idx').on(t.purchaseId),
  index('purchase_items_product_id_idx').on(t.productId),
  check('purchase_items_quantity_positive', sql`${t.quantity} > 0`),
  check('purchase_items_received_nonnegative', sql`${t.receivedQuantity} >= 0`),
  check('purchase_items_unit_cost_nonnegative', sql`${t.unitCostCents} >= 0`),
  check('purchase_items_total_nonnegative', sql`${t.totalCents} >= 0`),
]);

export const repairEvents = pgTable('repair_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  repairId: uuid('repair_id').notNull().references(() => repairs.id, { onDelete: 'cascade' }),
  fromStatus: repairStatus('from_status'),
  toStatus: repairStatus('to_status').notNull(),
  note: text('note'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('repair_events_repair_id_idx').on(t.repairId)]);

export const warrantyClaims = pgTable('warranty_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  folio: varchar('folio', { length: 24 }).notNull(),
  repairId: uuid('repair_id').notNull().references(() => repairs.id, { onDelete: 'restrict' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  status: warrantyClaimStatus('status').default('opened').notNull(),
  claimReason: text('claim_reason').notNull(),
  intakeEvidence: text('intake_evidence'),
  diagnosis: text('diagnosis'),
  resolution: text('resolution'),
  rejectionReason: text('rejection_reason'),
  receivedByUserId: uuid('received_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  assignedToUserId: uuid('assigned_to_user_id').references(() => users.id, { onDelete: 'set null' }),
  resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex('warranty_claims_folio_idx').on(t.folio),
  index('warranty_claims_business_status_idx').on(t.businessId, t.status),
  index('warranty_claims_repair_idx').on(t.repairId),
  index('warranty_claims_client_idx').on(t.clientId),
  index('warranty_claims_created_idx').on(t.createdAt),
  uniqueIndex('warranty_claims_one_active_per_repair_idx').on(t.repairId).where(sql`${t.status} not in ('resolved', 'closed', 'rejected', 'cancelled')`),
  check('warranty_claims_resolution_required', sql`${t.status} not in ('resolved', 'closed') or (${t.resolution} is not null and ${t.resolvedAt} is not null)`),
  check('warranty_claims_rejection_required', sql`${t.status} <> 'rejected' or ${t.rejectionReason} is not null`),
]);

export const warrantyClaimEvents = pgTable('warranty_claim_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  warrantyClaimId: uuid('warranty_claim_id').notNull().references(() => warrantyClaims.id, { onDelete: 'restrict' }),
  fromStatus: warrantyClaimStatus('from_status'),
  toStatus: warrantyClaimStatus('to_status').notNull(),
  note: text('note'),
  evidenceText: text('evidence_text'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('warranty_claim_events_claim_idx').on(t.warrantyClaimId, t.createdAt),
  index('warranty_claim_events_user_idx').on(t.createdByUserId),
]);

export const repairPayments = pgTable('repair_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  repairId: uuid('repair_id').notNull().references(() => repairs.id, { onDelete: 'restrict' }),
  amountCents: integer('amount_cents').notNull(),
  method: paymentMethod('method').notNull(),
  note: text('note'),
  receivedByUserId: uuid('received_by_user_id').notNull().references(() => users.id),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidedByUserId: uuid('voided_by_user_id').references(() => users.id),
}, (t) => [
  index('repair_payments_repair_id_idx').on(t.repairId),
  index('repair_payments_business_id_idx').on(t.businessId),
  check('repair_payments_amount_positive', sql`${t.amountCents} > 0`),
  check('repair_payments_status_valid', sql`${t.status} in ('active','voided')`),
]);

export const repairItems = pgTable('repair_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  repairId: uuid('repair_id').notNull().references(() => repairs.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'restrict' }),
  nameSnapshot: varchar('name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').default(0).notNull(),
  totalCents: integer('total_cents').default(0).notNull(),
  costCentsSnapshot: integer('cost_cents_snapshot').default(0).notNull(),
  costTotalCents: integer('cost_total_cents').default(0).notNull(),
  grossProfitCents: integer('gross_profit_cents').default(0).notNull(),
  grossMarginBps: integer('gross_margin_bps').default(0).notNull(),
  affectsInventory: boolean('affects_inventory').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidedByUserId: uuid('voided_by_user_id').references(() => users.id),
  voidReason: text('void_reason'),
}, (t) => [
  index('repair_items_repair_id_idx').on(t.repairId),
  index('repair_items_business_id_idx').on(t.businessId),
  index('repair_items_product_id_idx').on(t.productId),
  check('repair_items_quantity_positive', sql`${t.quantity} > 0`),
  check('repair_items_unit_price_nonnegative', sql`${t.unitPriceCents} >= 0`),
  check('repair_items_total_nonnegative', sql`${t.totalCents} >= 0`),
  check('repair_items_cost_nonnegative', sql`${t.costCentsSnapshot} >= 0`),
  check('repair_items_cost_total_nonnegative', sql`${t.costTotalCents} >= 0`),
]);

export const sales = pgTable('sales', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  folio: varchar('folio', { length: 20 }).notNull(),
  customerId: uuid('customer_id').references(() => clients.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  subtotalCents: integer('subtotal_cents').default(0).notNull(),
  discountCents: integer('discount_cents').default(0).notNull(),
  totalCents: integer('total_cents').default(0).notNull(),
  paymentMethod: paymentMethod('payment_method').notNull(),
  status: saleStatus('status').default('completed').notNull(),
  notes: text('notes'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex('sales_folio_idx').on(t.folio),
  index('sales_business_id_idx').on(t.businessId),
  index('sales_customer_id_idx').on(t.customerId),
  index('sales_user_id_idx').on(t.userId),
  index('sales_created_at_idx').on(t.createdAt),
  check('sales_subtotal_nonnegative', sql`${t.subtotalCents} >= 0`),
  check('sales_discount_nonnegative', sql`${t.discountCents} >= 0`),
  check('sales_total_nonnegative', sql`${t.totalCents} >= 0`),
]);

export const salePayments = pgTable('sale_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'restrict' }),
  method: paymentMethod('method').notNull(),
  amountCents: integer('amount_cents').notNull(),
  receivedAmountCents: integer('received_amount_cents'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidedByUserId: uuid('voided_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
  voidReason: text('void_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('sale_payments_business_idx').on(t.businessId),
  index('sale_payments_sale_idx').on(t.saleId),
  index('sale_payments_created_by_idx').on(t.createdByUserId),
  check('sale_payments_amount_positive', sql`${t.amountCents} > 0`),
  check('sale_payments_received_valid', sql`${t.receivedAmountCents} is null or ${t.receivedAmountCents} >= ${t.amountCents}`),
]);

export const saleItems = pgTable('sale_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  costCentsSnapshot: integer('cost_cents_snapshot').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('sale_items_business_id_idx').on(t.businessId),
  index('sale_items_sale_id_idx').on(t.saleId),
  index('sale_items_product_id_idx').on(t.productId),
  check('sale_items_quantity_positive', sql`${t.quantity} > 0`),
  check('sale_items_price_nonnegative', sql`${t.unitPriceCents} >= 0`),
  check('sale_items_subtotal_nonnegative', sql`${t.subtotalCents} >= 0`),
]);

export const saleReturns = pgTable('sale_returns', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  folio: varchar('folio', { length: 24 }).notNull(),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  status: saleReturnStatus('status').default('completed').notNull(),
  reason: text('reason').notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledByUserId: uuid('cancelled_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
  cancelReason: text('cancel_reason'),
  ...timestamps,
}, (t) => [
  uniqueIndex('sale_returns_folio_idx').on(t.folio),
  index('sale_returns_business_created_idx').on(t.businessId, t.createdAt),
  index('sale_returns_sale_idx').on(t.saleId),
  index('sale_returns_user_idx').on(t.userId),
  check('sale_returns_subtotal_nonnegative', sql`${t.subtotalCents} >= 0`),
  check('sale_returns_total_nonnegative', sql`${t.totalCents} >= 0`),
]);

export const saleReturnItems = pgTable('sale_return_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  saleReturnId: uuid('sale_return_id').notNull().references(() => saleReturns.id, { onDelete: 'restrict' }),
  saleItemId: uuid('sale_item_id').notNull().references(() => saleItems.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
  costCentsSnapshot: integer('cost_cents_snapshot').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('sale_return_items_return_sale_item_idx').on(t.saleReturnId, t.saleItemId),
  index('sale_return_items_sale_item_idx').on(t.saleItemId),
  index('sale_return_items_product_idx').on(t.productId),
  check('sale_return_items_quantity_positive', sql`${t.quantity} > 0`),
  check('sale_return_items_price_nonnegative', sql`${t.unitPriceCents} >= 0`),
  check('sale_return_items_total_nonnegative', sql`${t.totalCents} >= 0`),
  check('sale_return_items_cost_nonnegative', sql`${t.costCentsSnapshot} >= 0`),
]);

export const saleReturnPayments = pgTable('sale_return_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  saleReturnId: uuid('sale_return_id').notNull().references(() => saleReturns.id, { onDelete: 'restrict' }),
  method: paymentMethod('method').notNull(),
  amountCents: integer('amount_cents').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidedByUserId: uuid('voided_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
  voidReason: text('void_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('sale_return_payments_return_idx').on(t.saleReturnId),
  index('sale_return_payments_business_idx').on(t.businessId),
  check('sale_return_payments_amount_positive', sql`${t.amountCents} > 0`),
]);

export const layaways = pgTable('layaways', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  folio: varchar('folio', { length: 24 }).notNull(),
  customerId: uuid('customer_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  subtotalCents: integer('subtotal_cents').notNull(),
  discountCents: integer('discount_cents').default(0).notNull(),
  totalCents: integer('total_cents').notNull(),
  paidCents: integer('paid_cents').default(0).notNull(),
  balanceCents: integer('balance_cents').notNull(),
  status: layawayStatus('status').default('open').notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }),
  notes: text('notes'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledByUserId: uuid('cancelled_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
  cancelReason: text('cancel_reason'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  ...timestamps,
}, (t) => [
  uniqueIndex('layaways_folio_idx').on(t.folio),
  index('layaways_business_status_idx').on(t.businessId, t.status),
  index('layaways_customer_idx').on(t.customerId),
  index('layaways_due_idx').on(t.dueAt),
  check('layaways_subtotal_nonnegative', sql`${t.subtotalCents} >= 0`),
  check('layaways_discount_nonnegative', sql`${t.discountCents} >= 0`),
  check('layaways_total_nonnegative', sql`${t.totalCents} >= 0`),
  check('layaways_paid_nonnegative', sql`${t.paidCents} >= 0`),
  check('layaways_balance_nonnegative', sql`${t.balanceCents} >= 0`),
  check('layaways_totals_consistent', sql`${t.paidCents} + ${t.balanceCents} = ${t.totalCents}`),
]);

export const layawayItems = pgTable('layaway_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  layawayId: uuid('layaway_id').notNull().references(() => layaways.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  costCentsSnapshot: integer('cost_cents_snapshot').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('layaway_items_layaway_product_idx').on(t.layawayId, t.productId),
  index('layaway_items_product_idx').on(t.productId),
  check('layaway_items_quantity_positive', sql`${t.quantity} > 0`),
  check('layaway_items_price_nonnegative', sql`${t.unitPriceCents} >= 0`),
  check('layaway_items_subtotal_nonnegative', sql`${t.subtotalCents} >= 0`),
  check('layaway_items_cost_nonnegative', sql`${t.costCentsSnapshot} >= 0`),
]);

export const layawayPayments = pgTable('layaway_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  layawayId: uuid('layaway_id').notNull().references(() => layaways.id, { onDelete: 'restrict' }),
  method: paymentMethod('method').notNull(),
  amountCents: integer('amount_cents').notNull(),
  receivedAmountCents: integer('received_amount_cents'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidedByUserId: uuid('voided_by_user_id').references(() => users.id, { onDelete: 'restrict' }),
  voidReason: text('void_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('layaway_payments_layaway_idx').on(t.layawayId),
  index('layaway_payments_business_idx').on(t.businessId),
  check('layaway_payments_amount_positive', sql`${t.amountCents} > 0`),
  check('layaway_payments_received_valid', sql`${t.receivedAmountCents} is null or ${t.receivedAmountCents} >= ${t.amountCents}`),
]);

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  type: inventoryMovementType('type').notNull(),
  quantity: integer('quantity').notNull(),
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  referenceType: inventoryReferenceType('reference_type').notNull(),
  referenceId: uuid('reference_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('inventory_movements_business_id_idx').on(t.businessId),
  index('inventory_movements_product_id_idx').on(t.productId),
  index('inventory_movements_type_idx').on(t.type),
  index('inventory_movements_created_at_idx').on(t.createdAt),
  check('inventory_movements_quantity_positive', sql`${t.quantity} > 0`),
  check('inventory_movements_stock_nonnegative', sql`${t.newStock} >= 0`),
]);

export const cashRegisters = pgTable('cash_registers', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id, { onDelete: 'restrict' }),
  code: varchar('code', { length: 30 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  active: boolean('active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  ...timestamps,
}, (t) => [
  uniqueIndex('cash_registers_business_code_idx').on(t.businessId, t.code),
  index('cash_registers_business_active_idx').on(t.businessId, t.active),
  uniqueIndex('cash_registers_one_default_idx').on(t.businessId).where(sql`${t.isDefault} = true`),
]);

export const cashSessions = pgTable('cash_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  cashRegisterId: uuid('cash_register_id').notNull().references(() => cashRegisters.id, { onDelete: 'restrict' }),
  openedByUserId: uuid('opened_by_user_id').notNull().references(() => users.id),
  closedByUserId: uuid('closed_by_user_id').references(() => users.id),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  openingCashCents: integer('opening_cash_cents').default(0).notNull(),
  expectedCashCents: integer('expected_cash_cents').default(0).notNull(),
  countedCashCents: integer('counted_cash_cents'),
  differenceCents: integer('difference_cents'),
  status: cashSessionStatus('status').default('open').notNull(),
  notes: text('notes'),
  ...timestamps,
}, (t) => [
  index('cash_sessions_business_id_idx').on(t.businessId),
  index('cash_sessions_register_id_idx').on(t.cashRegisterId),
  index('cash_sessions_status_idx').on(t.status),
  index('cash_sessions_opened_at_idx').on(t.openedAt),
  uniqueIndex('cash_sessions_one_open_per_register_idx').on(t.cashRegisterId).where(sql`${t.status} = 'open'`),
  check('cash_sessions_opening_nonnegative', sql`${t.openingCashCents} >= 0`),
  check('cash_sessions_counted_nonnegative', sql`${t.countedCashCents} is null or ${t.countedCashCents} >= 0`),
]);

export const cashMovements = pgTable('cash_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  cashSessionId: uuid('cash_session_id').references(() => cashSessions.id, { onDelete: 'restrict' }),
  type: cashMovementType('type').notNull(),
  method: cashMovementMethod('method').notNull(),
  amountCents: integer('amount_cents').notNull(),
  direction: cashMovementDirection('direction').notNull(),
  referenceType: varchar('reference_type', { length: 30 }),
  referenceId: uuid('reference_id'),
  referenceFolio: varchar('reference_folio', { length: 40 }),
  reason: text('reason'),
  note: text('note'),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  voidedByUserId: uuid('voided_by_user_id').references(() => users.id),
  voidReason: text('void_reason'),
}, (t) => [
  index('cash_movements_business_id_idx').on(t.businessId),
  index('cash_movements_session_id_idx').on(t.cashSessionId),
  index('cash_movements_type_idx').on(t.type),
  index('cash_movements_method_idx').on(t.method),
  index('cash_movements_created_at_idx').on(t.createdAt),
  index('cash_movements_reference_idx').on(t.referenceType, t.referenceId),
  check('cash_movements_amount_positive', sql`${t.amountCents} > 0`),
]);
export const businessesRelations = relations(businesses, ({ one, many }) => ({
  settings: one(businessSettings, { fields: [businesses.id], references: [businessSettings.id] }),
  memberships: many(businessMemberships),
}));
export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  business: one(businesses, { fields: [businessSettings.id], references: [businesses.id] }),
}));
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(businessMemberships),
}));
export const businessMembershipsRelations = relations(businessMemberships, ({ one }) => ({
  business: one(businesses, { fields: [businessMemberships.businessId], references: [businesses.id] }),
  user: one(users, { fields: [businessMemberships.userId], references: [users.id] }),
}));
export const clientsRelations = relations(clients, ({ many }) => ({ repairs: many(repairs) }));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  compatibilities: many(productCompatibilities),
}));
export const productCompatibilitiesRelations = relations(productCompatibilities, ({ one }) => ({
  business: one(businessSettings, { fields: [productCompatibilities.businessId], references: [businessSettings.id] }),
  product: one(products, { fields: [productCompatibilities.productId], references: [products.id] }),
}));
export const suppliersRelations = relations(suppliers, ({ many }) => ({ purchases: many(purchases) }));
export const repairsRelations = relations(repairs, ({ one, many }) => ({
  client: one(clients, { fields: [repairs.clientId], references: [clients.id] }),
  assignedTo: one(users, { fields: [repairs.assignedToId], references: [users.id] }),
  events: many(repairEvents),
  payments: many(repairPayments),
  items: many(repairItems),
  purchases: many(purchases),
  warrantyClaims: many(warrantyClaims),
}));
export const warrantyClaimsRelations = relations(warrantyClaims, ({ one, many }) => ({
  business: one(businessSettings, { fields: [warrantyClaims.businessId], references: [businessSettings.id] }),
  repair: one(repairs, { fields: [warrantyClaims.repairId], references: [repairs.id] }),
  client: one(clients, { fields: [warrantyClaims.clientId], references: [clients.id] }),
  receivedBy: one(users, { fields: [warrantyClaims.receivedByUserId], references: [users.id] }),
  assignedTo: one(users, { fields: [warrantyClaims.assignedToUserId], references: [users.id] }),
  resolvedBy: one(users, { fields: [warrantyClaims.resolvedByUserId], references: [users.id] }),
  events: many(warrantyClaimEvents),
}));
export const warrantyClaimEventsRelations = relations(warrantyClaimEvents, ({ one }) => ({
  claim: one(warrantyClaims, { fields: [warrantyClaimEvents.warrantyClaimId], references: [warrantyClaims.id] }),
  createdBy: one(users, { fields: [warrantyClaimEvents.createdByUserId], references: [users.id] }),
}));
export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  business: one(businessSettings, { fields: [purchases.businessId], references: [businessSettings.id] }),
  supplier: one(suppliers, { fields: [purchases.supplierId], references: [suppliers.id] }),
  repair: one(repairs, { fields: [purchases.repairId], references: [repairs.id] }),
  createdBy: one(users, { fields: [purchases.createdByUserId], references: [users.id] }),
  updatedBy: one(users, { fields: [purchases.updatedByUserId], references: [users.id] }),
  items: many(purchaseItems),
}));
export const purchaseItemsRelations = relations(purchaseItems, ({ one }) => ({
  purchase: one(purchases, { fields: [purchaseItems.purchaseId], references: [purchases.id] }),
  product: one(products, { fields: [purchaseItems.productId], references: [products.id] }),
}));
export const repairPaymentsRelations = relations(repairPayments, ({ one }) => ({
  business: one(businessSettings, { fields: [repairPayments.businessId], references: [businessSettings.id] }),
  repair: one(repairs, { fields: [repairPayments.repairId], references: [repairs.id] }),
  receivedBy: one(users, { fields: [repairPayments.receivedByUserId], references: [users.id] }),
  voidedBy: one(users, { fields: [repairPayments.voidedByUserId], references: [users.id] }),
}));
export const repairItemsRelations = relations(repairItems, ({ one }) => ({
  business: one(businessSettings, { fields: [repairItems.businessId], references: [businessSettings.id] }),
  repair: one(repairs, { fields: [repairItems.repairId], references: [repairs.id] }),
  product: one(products, { fields: [repairItems.productId], references: [products.id] }),
  voidedBy: one(users, { fields: [repairItems.voidedByUserId], references: [users.id] }),
}));
export const salesRelations = relations(sales, ({ one, many }) => ({
  business: one(businessSettings, { fields: [sales.businessId], references: [businessSettings.id] }),
  customer: one(clients, { fields: [sales.customerId], references: [clients.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
  items: many(saleItems),
  payments: many(salePayments),
  returns: many(saleReturns),
}));
export const salePaymentsRelations = relations(salePayments, ({ one }) => ({
  business: one(businessSettings, { fields: [salePayments.businessId], references: [businessSettings.id] }),
  sale: one(sales, { fields: [salePayments.saleId], references: [sales.id] }),
  createdBy: one(users, { fields: [salePayments.createdByUserId], references: [users.id] }),
  voidedBy: one(users, { fields: [salePayments.voidedByUserId], references: [users.id] }),
}));
export const saleItemsRelations = relations(saleItems, ({ one, many }) => ({
  business: one(businessSettings, { fields: [saleItems.businessId], references: [businessSettings.id] }),
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
  returnItems: many(saleReturnItems),
}));
export const saleReturnsRelations = relations(saleReturns, ({ one, many }) => ({
  business: one(businessSettings, { fields: [saleReturns.businessId], references: [businessSettings.id] }),
  sale: one(sales, { fields: [saleReturns.saleId], references: [sales.id] }),
  user: one(users, { fields: [saleReturns.userId], references: [users.id] }),
  cancelledBy: one(users, { fields: [saleReturns.cancelledByUserId], references: [users.id] }),
  items: many(saleReturnItems),
  payments: many(saleReturnPayments),
}));
export const saleReturnItemsRelations = relations(saleReturnItems, ({ one }) => ({
  business: one(businessSettings, { fields: [saleReturnItems.businessId], references: [businessSettings.id] }),
  saleReturn: one(saleReturns, { fields: [saleReturnItems.saleReturnId], references: [saleReturns.id] }),
  saleItem: one(saleItems, { fields: [saleReturnItems.saleItemId], references: [saleItems.id] }),
  product: one(products, { fields: [saleReturnItems.productId], references: [products.id] }),
}));
export const saleReturnPaymentsRelations = relations(saleReturnPayments, ({ one }) => ({
  business: one(businessSettings, { fields: [saleReturnPayments.businessId], references: [businessSettings.id] }),
  saleReturn: one(saleReturns, { fields: [saleReturnPayments.saleReturnId], references: [saleReturns.id] }),
  createdBy: one(users, { fields: [saleReturnPayments.createdByUserId], references: [users.id] }),
  voidedBy: one(users, { fields: [saleReturnPayments.voidedByUserId], references: [users.id] }),
}));
export const layawaysRelations = relations(layaways, ({ one, many }) => ({
  business: one(businessSettings, { fields: [layaways.businessId], references: [businessSettings.id] }),
  customer: one(clients, { fields: [layaways.customerId], references: [clients.id] }),
  user: one(users, { fields: [layaways.userId], references: [users.id] }),
  cancelledBy: one(users, { fields: [layaways.cancelledByUserId], references: [users.id] }),
  items: many(layawayItems),
  payments: many(layawayPayments),
}));
export const layawayItemsRelations = relations(layawayItems, ({ one }) => ({
  business: one(businessSettings, { fields: [layawayItems.businessId], references: [businessSettings.id] }),
  layaway: one(layaways, { fields: [layawayItems.layawayId], references: [layaways.id] }),
  product: one(products, { fields: [layawayItems.productId], references: [products.id] }),
}));
export const layawayPaymentsRelations = relations(layawayPayments, ({ one }) => ({
  business: one(businessSettings, { fields: [layawayPayments.businessId], references: [businessSettings.id] }),
  layaway: one(layaways, { fields: [layawayPayments.layawayId], references: [layaways.id] }),
  createdBy: one(users, { fields: [layawayPayments.createdByUserId], references: [users.id] }),
  voidedBy: one(users, { fields: [layawayPayments.voidedByUserId], references: [users.id] }),
}));
export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  business: one(businessSettings, { fields: [inventoryMovements.businessId], references: [businessSettings.id] }),
  product: one(products, { fields: [inventoryMovements.productId], references: [products.id] }),
  user: one(users, { fields: [inventoryMovements.userId], references: [users.id] }),
}));
export const cashRegistersRelations = relations(cashRegisters, ({ one, many }) => ({
  business: one(businessSettings, { fields: [cashRegisters.businessId], references: [businessSettings.id] }),
  sessions: many(cashSessions),
}));
export const cashSessionsRelations = relations(cashSessions, ({ one, many }) => ({
  business: one(businessSettings, { fields: [cashSessions.businessId], references: [businessSettings.id] }),
  register: one(cashRegisters, { fields: [cashSessions.cashRegisterId], references: [cashRegisters.id] }),
  openedBy: one(users, { fields: [cashSessions.openedByUserId], references: [users.id] }),
  closedBy: one(users, { fields: [cashSessions.closedByUserId], references: [users.id] }),
  movements: many(cashMovements),
}));
export const cashMovementsRelations = relations(cashMovements, ({ one }) => ({
  business: one(businessSettings, { fields: [cashMovements.businessId], references: [businessSettings.id] }),
  session: one(cashSessions, { fields: [cashMovements.cashSessionId], references: [cashSessions.id] }),
  createdBy: one(users, { fields: [cashMovements.createdByUserId], references: [users.id] }),
  voidedBy: one(users, { fields: [cashMovements.voidedByUserId], references: [users.id] }),
}));


