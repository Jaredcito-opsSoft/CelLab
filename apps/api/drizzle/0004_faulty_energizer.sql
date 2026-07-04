ALTER TYPE "public"."inventory_movement_type" ADD VALUE 'service_usage_void';--> statement-breakpoint
ALTER TYPE "public"."inventory_reference_type" ADD VALUE 'repair' BEFORE 'manual';--> statement-breakpoint
ALTER TABLE "repair_items" ADD COLUMN "cost_cents_snapshot" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_items" ADD COLUMN "cost_total_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_items" ADD COLUMN "gross_profit_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_items" ADD COLUMN "gross_margin_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "repair_items" ADD COLUMN "voided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "repair_items" ADD COLUMN "voided_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "repair_items" ADD COLUMN "void_reason" text;--> statement-breakpoint
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_cost_nonnegative" CHECK ("repair_items"."cost_cents_snapshot" >= 0);--> statement-breakpoint
ALTER TABLE "repair_items" ADD CONSTRAINT "repair_items_cost_total_nonnegative" CHECK ("repair_items"."cost_total_cents" >= 0);