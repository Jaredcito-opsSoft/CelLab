CREATE TABLE "business_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_name" varchar(160) NOT NULL,
	"business_type" varchar(160) NOT NULL,
	"logo_url" text,
	"phone" varchar(30),
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"ticket_message" text,
	"warranty_message" text,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"primary_color" varchar(7) DEFAULT '#0A84FF' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
