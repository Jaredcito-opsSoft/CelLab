ALTER TABLE "business_settings" ADD COLUMN "require_open_cash_for_money_operations" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "business_settings" ADD COLUMN "timezone" text DEFAULT 'America/Mexico_City' NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "cost_cents_snapshot" integer DEFAULT 0 NOT NULL;