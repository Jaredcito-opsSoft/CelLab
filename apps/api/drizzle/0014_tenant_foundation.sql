CREATE TYPE "public"."business_status" AS ENUM('active', 'inactive');
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"status" "business_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "businesses" ("id", "name", "slug", "status", "created_at", "updated_at")
SELECT
	settings."id",
	settings."business_name",
	CASE
		WHEN settings."id" = '00000000-0000-4000-8000-000000000001'::uuid THEN 'cellab-tuxtla'
		ELSE
			substring(
				COALESCE(
					NULLIF(
						trim(BOTH '-' FROM regexp_replace(lower(settings."business_name"), '[^a-z0-9]+', '-', 'g')),
						''
					),
					'business'
				)
				FROM 1 FOR 63
			) || '-' || replace(settings."id"::text, '-', '')
	END,
	'active',
	settings."created_at",
	settings."updated_at"
FROM "business_settings" settings;
--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_slug_idx" ON "businesses" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "business_settings" ALTER COLUMN "id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "business_settings"
	ADD CONSTRAINT "business_settings_id_businesses_id_fk"
	FOREIGN KEY ("id") REFERENCES "public"."businesses"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_memberships"
	ADD CONSTRAINT "business_memberships_business_id_businesses_id_fk"
	FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_memberships"
	ADD CONSTRAINT "business_memberships_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "business_memberships_business_user_idx" ON "business_memberships" USING btree ("business_id","user_id");
--> statement-breakpoint
CREATE INDEX "business_memberships_user_id_idx" ON "business_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "business_memberships_business_id_idx" ON "business_memberships" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX "business_memberships_user_active_idx" ON "business_memberships" USING btree ("user_id","active");
--> statement-breakpoint
DO $$
DECLARE
	settings_count integer;
	users_count integer;
	current_business_id uuid;
BEGIN
	SELECT count(*)::integer INTO settings_count FROM "business_settings";
	SELECT count(*)::integer INTO users_count FROM "users";

	IF settings_count = 0 AND users_count > 0 THEN
		RAISE EXCEPTION
			'Tenant foundation backfill aborted: % global users exist without a business. Provide an explicit user-to-business mapping.',
			users_count;
	END IF;

	IF settings_count > 1 AND users_count > 0 THEN
		RAISE EXCEPTION
			'Tenant foundation backfill aborted: % businesses and % global users are ambiguous. Provide an explicit user-to-business mapping.',
			settings_count,
			users_count;
	END IF;

	IF settings_count = 1 THEN
		SELECT "id" INTO STRICT current_business_id FROM "business_settings";
		INSERT INTO "business_memberships" ("business_id", "user_id", "role", "active", "created_at", "updated_at")
		SELECT
			current_business_id,
			"id",
			"role",
			"active",
			"created_at",
			"updated_at"
		FROM "users";
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "businesses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "business_memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
	api_role text;
BEGIN
	FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated']
	LOOP
		IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
			EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.businesses FROM %I', api_role);
			EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.business_memberships FROM %I', api_role);
		END IF;
	END LOOP;
END $$;
