CREATE TABLE "job_pickup" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text,
	"customer_id" text NOT NULL,
	"picked_up_by_id" text NOT NULL,
	"picked_up_at" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"signature_data_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_pickup_jobId_unique" UNIQUE("job_id")
);
--> statement-breakpoint
ALTER TABLE "job_pickup" ADD CONSTRAINT "job_pickup_job_id_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pickup" ADD CONSTRAINT "job_pickup_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_pickup" ADD CONSTRAINT "job_pickup_picked_up_by_id_user_id_fk" FOREIGN KEY ("picked_up_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_pickup_customerId_idx" ON "job_pickup" USING btree ("customer_id");