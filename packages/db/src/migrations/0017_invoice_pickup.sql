ALTER TABLE "job_pickup" DROP CONSTRAINT "job_pickup_jobId_unique";--> statement-breakpoint
ALTER TABLE "job_pickup" DROP CONSTRAINT "job_pickup_job_id_job_id_fk";
--> statement-breakpoint
ALTER TABLE "job_pickup" ADD COLUMN "invoice_id" text;--> statement-breakpoint
UPDATE "job_pickup" p SET "invoice_id" = j."invoice_id" FROM "job" j WHERE j."id" = p."job_id" AND p."id" = (SELECT p2."id" FROM "job_pickup" p2 JOIN "job" j2 ON j2."id" = p2."job_id" WHERE j2."invoice_id" = j."invoice_id" ORDER BY p2."picked_up_at", p2."id" LIMIT 1);--> statement-breakpoint
ALTER TABLE "job_pickup" ADD CONSTRAINT "job_pickup_invoice_id_invoice_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pickup" DROP COLUMN "job_id";--> statement-breakpoint
ALTER TABLE "job_pickup" ADD CONSTRAINT "job_pickup_invoiceId_unique" UNIQUE("invoice_id");
