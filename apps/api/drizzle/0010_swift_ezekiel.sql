CREATE TYPE "public"."warranty_claim_status" AS ENUM('opened', 'under_review', 'approved', 'rejected', 'in_progress', 'resolved', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE "warranty_claim_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warranty_claim_id" uuid NOT NULL,
	"from_status" "warranty_claim_status",
	"to_status" "warranty_claim_status" NOT NULL,
	"note" text,
	"evidence_text" text,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warranty_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"folio" varchar(24) NOT NULL,
	"repair_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"status" "warranty_claim_status" DEFAULT 'opened' NOT NULL,
	"claim_reason" text NOT NULL,
	"intake_evidence" text,
	"diagnosis" text,
	"resolution" text,
	"rejection_reason" text,
	"received_by_user_id" uuid NOT NULL,
	"assigned_to_user_id" uuid,
	"resolved_by_user_id" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warranty_claims_resolution_required" CHECK ("warranty_claims"."status" not in ('resolved', 'closed') or ("warranty_claims"."resolution" is not null and "warranty_claims"."resolved_at" is not null)),
	CONSTRAINT "warranty_claims_rejection_required" CHECK ("warranty_claims"."status" <> 'rejected' or "warranty_claims"."rejection_reason" is not null)
);
--> statement-breakpoint
ALTER TABLE "warranty_claim_events" ADD CONSTRAINT "warranty_claim_events_warranty_claim_id_warranty_claims_id_fk" FOREIGN KEY ("warranty_claim_id") REFERENCES "public"."warranty_claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claim_events" ADD CONSTRAINT "warranty_claim_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_business_id_business_settings_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_settings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_repair_id_repairs_id_fk" FOREIGN KEY ("repair_id") REFERENCES "public"."repairs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warranty_claim_events_claim_idx" ON "warranty_claim_events" USING btree ("warranty_claim_id","created_at");--> statement-breakpoint
CREATE INDEX "warranty_claim_events_user_idx" ON "warranty_claim_events" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "warranty_claims_folio_idx" ON "warranty_claims" USING btree ("folio");--> statement-breakpoint
CREATE INDEX "warranty_claims_business_status_idx" ON "warranty_claims" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "warranty_claims_repair_idx" ON "warranty_claims" USING btree ("repair_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_client_idx" ON "warranty_claims" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "warranty_claims_created_idx" ON "warranty_claims" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "warranty_claims_one_active_per_repair_idx" ON "warranty_claims" USING btree ("repair_id") WHERE "warranty_claims"."status" not in ('resolved', 'closed', 'rejected', 'cancelled');