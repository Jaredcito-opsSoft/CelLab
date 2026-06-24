CREATE TYPE "public"."repair_status" AS ENUM('received', 'diagnosis', 'awaiting_authorization', 'in_repair', 'testing', 'ready', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'technician');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(140) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(180),
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folio_counters" (
	"scope" varchar(30) PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(50) NOT NULL,
	"name" varchar(160) NOT NULL,
	"category_id" uuid,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"price_cents" integer NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"minimum_stock" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_id" uuid NOT NULL,
	"from_status" "repair_status",
	"to_status" "repair_status" NOT NULL,
	"note" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folio" varchar(24) NOT NULL,
	"client_id" uuid NOT NULL,
	"assigned_to_id" uuid,
	"status" "repair_status" DEFAULT 'received' NOT NULL,
	"brand" varchar(80) NOT NULL,
	"model" varchar(120) NOT NULL,
	"serial_number" varchar(120),
	"reported_issue" text NOT NULL,
	"physical_condition" text NOT NULL,
	"diagnosis" text,
	"internal_notes" text,
	"deposit_cents" integer DEFAULT 0 NOT NULL,
	"estimated_cents" integer,
	"final_cents" integer,
	"warranty_days" integer DEFAULT 0 NOT NULL,
	"delivered_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(180) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'technician' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_events" ADD CONSTRAINT "repair_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repairs" ADD CONSTRAINT "repairs_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_phone_active_idx" ON "clients" USING btree ("phone") WHERE "clients"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "repairs_folio_idx" ON "repairs" USING btree ("folio");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");