CREATE TYPE "public"."cash_movement_direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."cash_movement_method" AS ENUM('cash', 'transfer', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."cash_movement_type" AS ENUM('opening_cash', 'sale_payment', 'repair_payment', 'manual_in', 'manual_out', 'sale_cancel', 'repair_payment_void', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."cash_session_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"cash_session_id" uuid,
	"type" "cash_movement_type" NOT NULL,
	"method" "cash_movement_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"direction" "cash_movement_direction" NOT NULL,
	"reference_type" varchar(30),
	"reference_id" uuid,
	"reference_folio" varchar(40),
	"reason" text,
	"note" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by_user_id" uuid,
	"void_reason" text,
	CONSTRAINT "cash_movements_amount_positive" CHECK ("cash_movements"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "cash_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"opened_by_user_id" uuid NOT NULL,
	"closed_by_user_id" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"opening_cash_cents" integer DEFAULT 0 NOT NULL,
	"expected_cash_cents" integer DEFAULT 0 NOT NULL,
	"counted_cash_cents" integer,
	"difference_cents" integer,
	"status" "cash_session_status" DEFAULT 'open' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_sessions_opening_nonnegative" CHECK ("cash_sessions"."opening_cash_cents" >= 0),
	CONSTRAINT "cash_sessions_counted_nonnegative" CHECK ("cash_sessions"."counted_cash_cents" is null or "cash_sessions"."counted_cash_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cash_session_id_cash_sessions_id_fk" FOREIGN KEY ("cash_session_id") REFERENCES "public"."cash_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_business_id_idx" ON "cash_movements" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cash_movements_session_id_idx" ON "cash_movements" USING btree ("cash_session_id");--> statement-breakpoint
CREATE INDEX "cash_movements_type_idx" ON "cash_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "cash_movements_method_idx" ON "cash_movements" USING btree ("method");--> statement-breakpoint
CREATE INDEX "cash_movements_created_at_idx" ON "cash_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cash_movements_reference_idx" ON "cash_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "cash_sessions_business_id_idx" ON "cash_sessions" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "cash_sessions_status_idx" ON "cash_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cash_sessions_opened_at_idx" ON "cash_sessions" USING btree ("opened_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_one_open_per_business_idx" ON "cash_sessions" USING btree ("business_id") WHERE "cash_sessions"."status" = 'open';