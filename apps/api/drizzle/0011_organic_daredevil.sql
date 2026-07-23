CREATE TYPE "public"."layaway_status" AS ENUM('open', 'paid', 'delivered', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."sale_return_status" AS ENUM('completed', 'cancelled');--> statement-breakpoint
ALTER TYPE "public"."cash_movement_type" ADD VALUE 'sale_refund' BEFORE 'repair_payment';--> statement-breakpoint
ALTER TYPE "public"."cash_movement_type" ADD VALUE 'layaway_payment' BEFORE 'adjustment';--> statement-breakpoint
ALTER TYPE "public"."cash_movement_type" ADD VALUE 'layaway_payment_void' BEFORE 'adjustment';--> statement-breakpoint
ALTER TYPE "public"."inventory_movement_type" ADD VALUE 'sale_return' BEFORE 'stock_entry';--> statement-breakpoint
ALTER TYPE "public"."inventory_movement_type" ADD VALUE 'layaway_reserve';--> statement-breakpoint
ALTER TYPE "public"."inventory_movement_type" ADD VALUE 'layaway_release';--> statement-breakpoint
ALTER TYPE "public"."inventory_reference_type" ADD VALUE 'sale_return' BEFORE 'product';--> statement-breakpoint
ALTER TYPE "public"."inventory_reference_type" ADD VALUE 'layaway' BEFORE 'product';--> statement-breakpoint
ALTER TYPE "public"."payment_method" ADD VALUE 'mixed';--> statement-breakpoint
ALTER TYPE "public"."sale_status" ADD VALUE 'partially_refunded' BEFORE 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."sale_status" ADD VALUE 'refunded' BEFORE 'cancelled';--> statement-breakpoint
CREATE TABLE "layaway_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"layaway_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"cost_cents_snapshot" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "layaway_items_quantity_positive" CHECK ("layaway_items"."quantity" > 0),
	CONSTRAINT "layaway_items_price_nonnegative" CHECK ("layaway_items"."unit_price_cents" >= 0),
	CONSTRAINT "layaway_items_subtotal_nonnegative" CHECK ("layaway_items"."subtotal_cents" >= 0),
	CONSTRAINT "layaway_items_cost_nonnegative" CHECK ("layaway_items"."cost_cents_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "layaway_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"layaway_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"received_amount_cents" integer,
	"created_by_user_id" uuid NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" uuid,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "layaway_payments_amount_positive" CHECK ("layaway_payments"."amount_cents" > 0),
	CONSTRAINT "layaway_payments_received_valid" CHECK ("layaway_payments"."received_amount_cents" is null or "layaway_payments"."received_amount_cents" >= "layaway_payments"."amount_cents")
);
--> statement-breakpoint
CREATE TABLE "layaways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"folio" varchar(24) NOT NULL,
	"customer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"balance_cents" integer NOT NULL,
	"status" "layaway_status" DEFAULT 'open' NOT NULL,
	"due_at" timestamp with time zone,
	"notes" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_user_id" uuid,
	"cancel_reason" text,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "layaways_subtotal_nonnegative" CHECK ("layaways"."subtotal_cents" >= 0),
	CONSTRAINT "layaways_discount_nonnegative" CHECK ("layaways"."discount_cents" >= 0),
	CONSTRAINT "layaways_total_nonnegative" CHECK ("layaways"."total_cents" >= 0),
	CONSTRAINT "layaways_paid_nonnegative" CHECK ("layaways"."paid_cents" >= 0),
	CONSTRAINT "layaways_balance_nonnegative" CHECK ("layaways"."balance_cents" >= 0),
	CONSTRAINT "layaways_totals_consistent" CHECK ("layaways"."paid_cents" + "layaways"."balance_cents" = "layaways"."total_cents")
);
--> statement-breakpoint
CREATE TABLE "sale_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sale_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"received_amount_cents" integer,
	"created_by_user_id" uuid NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" uuid,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_payments_amount_positive" CHECK ("sale_payments"."amount_cents" > 0),
	CONSTRAINT "sale_payments_received_valid" CHECK ("sale_payments"."received_amount_cents" is null or "sale_payments"."received_amount_cents" >= "sale_payments"."amount_cents")
);
--> statement-breakpoint
CREATE TABLE "sale_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sale_return_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name_snapshot" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"cost_cents_snapshot" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_return_items_quantity_positive" CHECK ("sale_return_items"."quantity" > 0),
	CONSTRAINT "sale_return_items_price_nonnegative" CHECK ("sale_return_items"."unit_price_cents" >= 0),
	CONSTRAINT "sale_return_items_total_nonnegative" CHECK ("sale_return_items"."total_cents" >= 0),
	CONSTRAINT "sale_return_items_cost_nonnegative" CHECK ("sale_return_items"."cost_cents_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sale_return_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sale_return_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" uuid,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_return_payments_amount_positive" CHECK ("sale_return_payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "sale_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"folio" varchar(24) NOT NULL,
	"sale_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "sale_return_status" DEFAULT 'completed' NOT NULL,
	"reason" text NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancelled_by_user_id" uuid,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_returns_subtotal_nonnegative" CHECK ("sale_returns"."subtotal_cents" >= 0),
	CONSTRAINT "sale_returns_total_nonnegative" CHECK ("sale_returns"."total_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "layaway_items" ADD CONSTRAINT "layaway_items_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaway_items" ADD CONSTRAINT "layaway_items_layaway_id_layaways_id_fk" FOREIGN KEY ("layaway_id") REFERENCES "public"."layaways"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaway_items" ADD CONSTRAINT "layaway_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaway_payments" ADD CONSTRAINT "layaway_payments_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaway_payments" ADD CONSTRAINT "layaway_payments_layaway_id_layaways_id_fk" FOREIGN KEY ("layaway_id") REFERENCES "public"."layaways"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaway_payments" ADD CONSTRAINT "layaway_payments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaway_payments" ADD CONSTRAINT "layaway_payments_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaways" ADD CONSTRAINT "layaways_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaways" ADD CONSTRAINT "layaways_customer_id_clients_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaways" ADD CONSTRAINT "layaways_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layaways" ADD CONSTRAINT "layaways_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_sale_return_id_sale_returns_id_fk" FOREIGN KEY ("sale_return_id") REFERENCES "public"."sale_returns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_payments" ADD CONSTRAINT "sale_return_payments_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_payments" ADD CONSTRAINT "sale_return_payments_sale_return_id_sale_returns_id_fk" FOREIGN KEY ("sale_return_id") REFERENCES "public"."sale_returns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_payments" ADD CONSTRAINT "sale_return_payments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_return_payments" ADD CONSTRAINT "sale_return_payments_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "layaway_items_layaway_product_idx" ON "layaway_items" USING btree ("layaway_id","product_id");--> statement-breakpoint
CREATE INDEX "layaway_items_product_idx" ON "layaway_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "layaway_payments_layaway_idx" ON "layaway_payments" USING btree ("layaway_id");--> statement-breakpoint
CREATE INDEX "layaway_payments_business_idx" ON "layaway_payments" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "layaways_folio_idx" ON "layaways" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "layaways_business_status_idx" ON "layaways" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "layaways_customer_idx" ON "layaways" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "layaways_due_idx" ON "layaways" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "sale_payments_business_idx" ON "sale_payments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "sale_payments_sale_idx" ON "sale_payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_payments_created_by_idx" ON "sale_payments" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_return_items_return_sale_item_idx" ON "sale_return_items" USING btree ("sale_return_id","sale_item_id");--> statement-breakpoint
CREATE INDEX "sale_return_items_sale_item_idx" ON "sale_return_items" USING btree ("sale_item_id");--> statement-breakpoint
CREATE INDEX "sale_return_items_product_idx" ON "sale_return_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sale_return_payments_return_idx" ON "sale_return_payments" USING btree ("sale_return_id");--> statement-breakpoint
CREATE INDEX "sale_return_payments_business_idx" ON "sale_return_payments" USING btree ("business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_returns_folio_idx" ON "sale_returns" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "sale_returns_business_created_idx" ON "sale_returns" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "sale_returns_sale_idx" ON "sale_returns" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "sale_returns_user_idx" ON "sale_returns" USING btree ("user_id");
--> statement-breakpoint
INSERT INTO "sale_payments" ("business_id", "sale_id", "method", "amount_cents", "created_by_user_id", "created_at")
SELECT "business_id", "id", "payment_method", "total_cents", "user_id", "created_at"
FROM "sales"
WHERE "total_cents" > 0;
