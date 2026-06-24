CREATE TYPE "public"."inventory_movement_type" AS ENUM('sale', 'sale_cancel', 'stock_entry', 'manual_adjustment');--> statement-breakpoint
CREATE TYPE "public"."inventory_reference_type" AS ENUM('sale', 'product', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'transfer', 'card');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "inventory_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"reference_type" "inventory_reference_type" NOT NULL,
	"reference_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_quantity_positive" CHECK ("inventory_movements"."quantity" > 0),
	CONSTRAINT "inventory_movements_stock_nonnegative" CHECK ("inventory_movements"."new_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_items_quantity_positive" CHECK ("sale_items"."quantity" > 0),
	CONSTRAINT "sale_items_price_nonnegative" CHECK ("sale_items"."unit_price_cents" >= 0),
	CONSTRAINT "sale_items_subtotal_nonnegative" CHECK ("sale_items"."subtotal_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"folio" varchar(20) NOT NULL,
	"customer_id" uuid,
	"user_id" uuid NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"status" "sale_status" DEFAULT 'completed' NOT NULL,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_subtotal_nonnegative" CHECK ("sales"."subtotal_cents" >= 0),
	CONSTRAINT "sales_discount_nonnegative" CHECK ("sales"."discount_cents" >= 0),
	CONSTRAINT "sales_total_nonnegative" CHECK ("sales"."total_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_clients_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_business_id_idx" ON "inventory_movements" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_product_id_idx" ON "inventory_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sale_items_business_id_idx" ON "sale_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_items_product_id_idx" ON "sale_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_folio_idx" ON "sales" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "sales_business_id_idx" ON "sales" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "sales_customer_id_idx" ON "sales" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_user_id_idx" ON "sales" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sales_created_at_idx" ON "sales" USING btree ("created_at");