CREATE TABLE "product_compatibilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"brand" varchar(80) NOT NULL,
	"model" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "barcode" varchar(80);--> statement-breakpoint
ALTER TABLE "product_compatibilities" ADD CONSTRAINT "product_compatibilities_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_compatibilities" ADD CONSTRAINT "product_compatibilities_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_compatibilities_business_idx" ON "product_compatibilities" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "product_compatibilities_product_idx" ON "product_compatibilities" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_compatibilities_unique_idx" ON "product_compatibilities" USING btree ("business_id","product_id","brand","model");--> statement-breakpoint
CREATE UNIQUE INDEX "products_barcode_active_idx" ON "products" USING btree ("barcode") WHERE "products"."barcode" is not null and "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");