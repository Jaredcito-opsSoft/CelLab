CREATE TYPE "public"."purchase_status" AS ENUM('draft', 'ordered', 'partially_received', 'received', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."inventory_movement_type" ADD VALUE 'purchase_receipt';--> statement-breakpoint
ALTER TYPE "public"."inventory_reference_type" ADD VALUE 'purchase';--> statement-breakpoint
CREATE TABLE "business_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"module_key" varchar(80) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"configured_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_items_quantity_positive" CHECK ("purchase_items"."quantity" > 0),
	CONSTRAINT "purchase_items_received_nonnegative" CHECK ("purchase_items"."received_quantity" >= 0),
	CONSTRAINT "purchase_items_unit_cost_nonnegative" CHECK ("purchase_items"."unit_cost_cents" >= 0),
	CONSTRAINT "purchase_items_total_nonnegative" CHECK ("purchase_items"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"repair_id" uuid,
	"folio" varchar(24) NOT NULL,
	"status" "purchase_status" DEFAULT 'draft' NOT NULL,
	"expected_at" timestamp with time zone,
	"notes" text,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_subtotal_nonnegative" CHECK ("purchases"."subtotal_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"contact_name" varchar(140),
	"phone" varchar(30),
	"email" varchar(180),
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_modules" ADD CONSTRAINT "business_modules_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_modules" ADD CONSTRAINT "business_modules_configured_by_user_id_users_id_fk" FOREIGN KEY ("configured_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_modules_business_id_idx" ON "business_modules" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "business_modules_module_key_idx" ON "business_modules" USING btree ("module_key");--> statement-breakpoint
CREATE UNIQUE INDEX "business_modules_business_key_idx" ON "business_modules" USING btree ("business_id","module_key");--> statement-breakpoint
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX "purchase_items_product_id_idx" ON "purchase_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_folio_idx" ON "purchases" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "purchases_business_id_idx" ON "purchases" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "purchases_supplier_id_idx" ON "purchases" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchases_repair_id_idx" ON "purchases" USING btree ("repair_id");--> statement-breakpoint
CREATE INDEX "purchases_status_idx" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "suppliers_name_idx" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_name_active_idx" ON "suppliers" USING btree ("name") WHERE "suppliers"."deleted_at" is null;
--> statement-breakpoint
INSERT INTO "business_modules" ("business_id", "module_key", "enabled")
SELECT "id", module_key, enabled
FROM "business_settings"
CROSS JOIN (
	VALUES
		('core_pos', true),
		('cash', true),
		('inventory_basic', true),
		('repairs', true),
		('public_tracking', true),
		('suppliers', false),
		('purchases', false),
		('repair_parts', true),
		('advanced_reports', false)
) AS defaults(module_key, enabled)
ON CONFLICT ("business_id", "module_key") DO NOTHING;
