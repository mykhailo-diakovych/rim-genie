CREATE TYPE "public"."proof_stage" AS ENUM('before', 'after');--> statement-breakpoint
CREATE TABLE "job_proof" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"job_id" text,
	"stage" "proof_stage" NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"duration_seconds" integer,
	"notes" text,
	"uploaded_by_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "job_proof_objectKey_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "job_proof" ADD CONSTRAINT "job_proof_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_proof" ADD CONSTRAINT "job_proof_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_proof" ADD CONSTRAINT "job_proof_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_proof_invoiceId_idx" ON "job_proof" USING btree ("invoice_id");