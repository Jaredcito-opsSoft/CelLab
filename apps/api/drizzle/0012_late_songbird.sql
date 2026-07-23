CREATE TABLE "cash_registers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_registers_business_code_idx" ON "cash_registers" USING btree ("business_id","code");--> statement-breakpoint
CREATE INDEX "cash_registers_business_active_idx" ON "cash_registers" USING btree ("business_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_registers_one_default_idx" ON "cash_registers" USING btree ("business_id") WHERE "cash_registers"."is_default" = true;--> statement-breakpoint
INSERT INTO "cash_registers" ("business_id", "code", "name", "active", "is_default")
SELECT "id", 'CAJA-01', 'Caja principal', true, true FROM "business_settings";--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD COLUMN "cash_register_id" uuid;--> statement-breakpoint
UPDATE "cash_sessions" AS cs SET "cash_register_id" = cr."id"
FROM "cash_registers" AS cr
WHERE cr."business_id" = cs."business_id" AND cr."is_default" = true;--> statement-breakpoint
ALTER TABLE "cash_sessions" ALTER COLUMN "cash_register_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cash_register_id_cash_registers_id_fk" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_sessions_register_id_idx" ON "cash_sessions" USING btree ("cash_register_id");--> statement-breakpoint
DROP INDEX "cash_sessions_one_open_per_business_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "cash_sessions_one_open_per_register_idx" ON "cash_sessions" USING btree ("cash_register_id") WHERE "cash_sessions"."status" = 'open';
