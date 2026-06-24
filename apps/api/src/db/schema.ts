import { relations, sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['admin', 'technician']);
export const repairStatus = pgEnum('repair_status', ['received', 'diagnosis', 'awaiting_authorization', 'in_repair', 'testing', 'ready', 'delivered', 'cancelled']);
export const paymentMethod = pgEnum('payment_method', ['cash', 'transfer', 'card']);
export const saleStatus = pgEnum('sale_status', ['completed', 'cancelled']);
export const inventoryMovementType = pgEnum('inventory_movement_type', ['sale', 'sale_cancel', 'stock_entry', 'manual_adjustment']);
export const inventoryReferenceType = pgEnum('inventory_reference_type', ['sale', 'product', 'manual']);
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};
export const businessSettings = pgTable('business_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
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
  ...timestamps,
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(), name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 180 }).notNull(), passwordHash: text('password_hash').notNull(),
  role: userRole('role').default('technician').notNull(), active: boolean('active').default(true).notNull(), ...timestamps,
}, (t) => [uniqueIndex('users_email_idx').on(t.email)]);
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(), name: varchar('name', { length: 140 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(), email: varchar('email', { length: 180 }),
  notes: text('notes'), deletedAt: timestamp('deleted_at', { withTimezone: true }), ...timestamps,
}, (t) => [uniqueIndex('clients_phone_active_idx').on(t.phone).where(sql`${t.deletedAt} is null`)]);
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(), name: varchar('name', { length: 100 }).notNull(),
  active: boolean('active').default(true).notNull(), ...timestamps,
}, (t) => [uniqueIndex('categories_name_idx').on(t.name)]);
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(), sku: varchar('sku', { length: 50 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(), categoryId: uuid('category_id').references(() => categories.id),
  costCents: integer('cost_cents').default(0).notNull(), priceCents: integer('price_cents').notNull(),
  stock: integer('stock').default(0).notNull(), minimumStock: integer('minimum_stock').default(0).notNull(),
  active: boolean('active').default(true).notNull(), deletedAt: timestamp('deleted_at', { withTimezone: true }), ...timestamps,
}, (t) => [uniqueIndex('products_sku_idx').on(t.sku)]);
export const folioCounters = pgTable('folio_counters', {
  scope: varchar('scope', { length: 30 }).primaryKey(), value: integer('value').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const repairs = pgTable('repairs', {
  id: uuid('id').defaultRandom().primaryKey(), folio: varchar('folio', { length: 24 }).notNull(),
  clientId: uuid('client_id').notNull().references(() => clients.id), assignedToId: uuid('assigned_to_id').references(() => users.id),
  status: repairStatus('status').default('received').notNull(), brand: varchar('brand', { length: 80 }).notNull(),
  model: varchar('model', { length: 120 }).notNull(), serialNumber: varchar('serial_number', { length: 120 }),
  reportedIssue: text('reported_issue').notNull(), physicalCondition: text('physical_condition').notNull(),
  diagnosis: text('diagnosis'), internalNotes: text('internal_notes'), depositCents: integer('deposit_cents').default(0).notNull(),
  estimatedCents: integer('estimated_cents'), finalCents: integer('final_cents'), warrantyDays: integer('warranty_days').default(0).notNull(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }), deletedAt: timestamp('deleted_at', { withTimezone: true }), ...timestamps,
}, (t) => [uniqueIndex('repairs_folio_idx').on(t.folio)]);
export const repairEvents = pgTable('repair_events', {
  id: uuid('id').defaultRandom().primaryKey(), repairId: uuid('repair_id').notNull().references(() => repairs.id, { onDelete: 'cascade' }),
  fromStatus: repairStatus('from_status'), toStatus: repairStatus('to_status').notNull(), note: text('note'),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
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

export const saleItems = pgTable('sale_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  businessId: uuid('business_id').notNull().references(() => businessSettings.id),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'restrict' }),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  productNameSnapshot: varchar('product_name_snapshot', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('sale_items_business_id_idx').on(t.businessId),
  index('sale_items_sale_id_idx').on(t.saleId),
  index('sale_items_product_id_idx').on(t.productId),
  check('sale_items_quantity_positive', sql`${t.quantity} > 0`),
  check('sale_items_price_nonnegative', sql`${t.unitPriceCents} >= 0`),
  check('sale_items_subtotal_nonnegative', sql`${t.subtotalCents} >= 0`),
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

export const clientsRelations = relations(clients, ({ many }) => ({ repairs: many(repairs) }));
export const repairsRelations = relations(repairs, ({ one, many }) => ({
  client: one(clients, { fields: [repairs.clientId], references: [clients.id] }),
  assignedTo: one(users, { fields: [repairs.assignedToId], references: [users.id] }), events: many(repairEvents),
}));
export const salesRelations = relations(sales, ({ one, many }) => ({
  business: one(businessSettings, { fields: [sales.businessId], references: [businessSettings.id] }),
  customer: one(clients, { fields: [sales.customerId], references: [clients.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
  items: many(saleItems),
}));
export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  business: one(businessSettings, { fields: [saleItems.businessId], references: [businessSettings.id] }),
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));
export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  business: one(businessSettings, { fields: [inventoryMovements.businessId], references: [businessSettings.id] }),
  product: one(products, { fields: [inventoryMovements.productId], references: [products.id] }),
  user: one(users, { fields: [inventoryMovements.userId], references: [users.id] }),
}));
