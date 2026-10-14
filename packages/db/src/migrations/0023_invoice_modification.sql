CREATE TYPE "public"."invoice_audit_event_type" AS ENUM('modification_requested', 'modification_approved', 'modification_rejected', 'refinalized', 'sent_to_cashier');--> statement-breakpoint
CREATE TYPE "public"."invoice_modification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."quote_status" ADD VALUE 'pending_finalization';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'invoice_modification_request';--> statement-breakpoint
CREATE TABLE "invoice_audit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"modification_request_id" text,
	"type" "invoice_audit_event_type" NOT NULL,
	"actor_id" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_modification_request" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"assigned_admin_id" text NOT NULL,
	"reason" text,
	"status" "invoice_modification_status" DEFAULT 'pending' NOT NULL,
	"resolved_by_id" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice_audit_event" ADD CONSTRAINT "invoice_audit_event_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_audit_event" ADD CONSTRAINT "invoice_audit_event_modification_request_id_invoice_modification_request_id_fk" FOREIGN KEY ("modification_request_id") REFERENCES "public"."invoice_modification_request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_audit_event" ADD CONSTRAINT "invoice_audit_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_modification_request" ADD CONSTRAINT "invoice_modification_request_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_modification_request" ADD CONSTRAINT "invoice_modification_request_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_modification_request" ADD CONSTRAINT "invoice_modification_request_assigned_admin_id_user_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_modification_request" ADD CONSTRAINT "invoice_modification_request_resolved_by_id_user_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invoice_audit_event_invoiceId_idx" ON "invoice_audit_event" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE INDEX "invoice_modification_request_invoiceId_idx" ON "invoice_modification_request" USING btree ("invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_modification_request_one_pending" ON "invoice_modification_request" USING btree ("invoice_id") WHERE "invoice_modification_request"."status" = 'pending';