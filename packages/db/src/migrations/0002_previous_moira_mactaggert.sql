CREATE TYPE "public"."inventory_record_type" AS ENUM('eod', 'sod');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unpaid', 'partially_paid', 'paid');--> statement-breakpoint
CREATE TYPE "public"."payment_mode" AS ENUM('credit_card', 'debit_card', 'bank_transfer', 'cash', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'accepted', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "inventory_record" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "inventory_record_type" NOT NULL,
	"record_date" text NOT NULL,
	"unfinished_job_count" integer NOT NULL,
	"rim_count" integer NOT NULL,
	"previous_eod_id" text,
	"has_discrepancy" boolean DEFAULT false NOT NULL,
	"discrepancy_notes" text,
	"notes" text,
	"recorded_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_record_type_date_unique" UNIQUE("type","record_date")
);
--> statement-breakpoint
CREATE TABLE "invoice" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" serial NOT NULL,
	"quote_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"status" "invoice_status" DEFAULT 'unpaid' NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"tax" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_quoteId_unique" UNIQUE("quote_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_item" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"vehicle_size" text,
	"side_of_vehicle" text,
	"damage_level" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"job_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"comments" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"amount" integer NOT NULL,
	"mode" "payment_mode" NOT NULL,
	"reference" text,
	"received_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"invoice_item_id" text NOT NULL,
	"technician_id" text,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"accepted_at" timestamp,
	"completed_at" timestamp,
	"due_date" timestamp,
	"is_overnight" boolean DEFAULT false NOT NULL,
	"special_notes" text,
	"proof_video_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_invoiceItemId_unique" UNIQUE("invoice_item_id")
);
--> statement-breakpoint
ALTER TABLE "inventory_record" ADD CONSTRAINT "inventory_record_recorded_by_id_user_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_received_by_id_user_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_invoice_item_id_invoice_item_id_fk" FOREIGN KEY ("invoice_item_id") REFERENCES "public"."invoice_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_technician_id_user_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_record_type_idx" ON "inventory_record" USING btree ("type");--> statement-breakpoint
CREATE INDEX "inventory_record_recordDate_idx" ON "inventory_record" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "inventory_record_recordedById_idx" ON "inventory_record" USING btree ("recorded_by_id");--> statement-breakpoint
CREATE INDEX "invoice_customerId_idx" ON "invoice" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoice_createdById_idx" ON "invoice" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "invoice_status_idx" ON "invoice" USING btree ("status");--> statement-breakpoint
CREATE INDEX "invoiceItem_invoiceId_idx" ON "invoice_item" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_invoiceId_idx" ON "payment" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_receivedById_idx" ON "payment" USING btree ("received_by_id");--> statement-breakpoint
CREATE INDEX "job_invoiceId_idx" ON "job" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "job_technicianId_idx" ON "job" USING btree ("technician_id");--> statement-breakpoint
CREATE INDEX "job_status_idx" ON "job" USING btree ("status");