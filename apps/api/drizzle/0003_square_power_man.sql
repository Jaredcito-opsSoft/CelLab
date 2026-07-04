ALTER TYPE "public"."inventory_movement_type" ADD VALUE 'service_usage';--> statement-breakpoint
CREATE TABLE "repair_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"repair_id" uuid NOT NULL,
	"product_id" uuid,
	"name_snapshot" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"affects_inventory" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repair_items_quantity_positive" CHECK ("repair_items"."quantity" > 0),
	CONSTRAINT "repair_items_unit_price_nonnegative" CHECK ("repair_items"."unit_price_cents" >= 0),
	CONSTRAINT "repair_items_total_nonnegative" CHECK ("repair_items"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "repair_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"repair_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"note" text,
	"received_by_user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" uuid,
	CONSTRAINT "repair_payments_amount_positive" CHECK ("repair_payments"."amount_cents" > 0),
	CONSTRAINT "repair_payments_status_valid" CHECK ("repair_payments"."status" in ('active','voided'))
);
--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "device_color" varchar(80);--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "accessories_received" text;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "public_notes" text;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "quote_status" varchar(30) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "authorized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "warranty_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "warranty_notes" text;--> statement-breakpoint
ALTER TABLE "repairs" ADD COLUMN "tracking_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_payments" ADD CONSTRAINT "repair_payments_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_payments" ADD CONSTRAINT "repair_payments_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_payments" ADD CONSTRAINT "repair_payments_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_payments" ADD CONSTRAINT "repair_payments_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repair_items_repair_id_idx" ON "repair_items" USING btree ("repair_id");--> statement-breakpoint
CREATE INDEX "repair_items_business_id_idx" ON "repair_items" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "repair_items_product_id_idx" ON "repair_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "repair_payments_repair_id_idx" ON "repair_payments" USING btree ("repair_id");--> statement-breakpoint
CREATE INDEX "repair_payments_business_id_idx" ON "repair_payments" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "repair_events_repair_id_idx" ON "repair_events" USING btree ("repair_id");--> statement-breakpoint
CREATE INDEX "repairs_status_idx" ON "repairs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "repairs_client_id_idx" ON "repairs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "repairs_created_at_idx" ON "repairs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_deposit_nonnegative" CHECK ("repairs"."deposit_cents" >= 0);--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_estimated_nonnegative" CHECK ("repairs"."estimated_cents" is null or "repairs"."estimated_cents" >= 0);--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_final_nonnegative" CHECK ("repairs"."final_cents" is null or "repairs"."final_cents" >= 0);--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_warranty_days_nonnegative" CHECK ("repairs"."warranty_days" >= 0);--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_quote_status_valid" CHECK ("repairs"."quote_status" in ('pending','quoted','authorized','rejected'));