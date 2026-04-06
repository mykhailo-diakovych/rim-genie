CREATE TYPE "public"."discount_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."discount_request_type" AS ENUM('quote', 'customer');--> statement-breakpoint
CREATE TABLE "discount_request" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "discount_request_type" NOT NULL,
	"status" "discount_request_status" DEFAULT 'pending' NOT NULL,
	"quote_id" text,
	"customer_id" text,
	"requested_by_id" text NOT NULL,
	"requested_percent" integer NOT NULL,
	"approved_percent" integer,
	"resolved_by_id" text,
	"resolved_at" timestamp,
	"reason" text,
	"admin_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "is_picked_up" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "is_missing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "discount_request" ADD CONSTRAINT "discount_request_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_request" ADD CONSTRAINT "discount_request_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_request" ADD CONSTRAINT "discount_request_requested_by_id_user_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_request" ADD CONSTRAINT "discount_request_resolved_by_id_user_id_fk" FOREIGN KEY ("resolved_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discount_request_status_idx" ON "discount_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "discount_request_quoteId_idx" ON "discount_request" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "discount_request_customerId_idx" ON "discount_request" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "location_name_idx" ON "location" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customer_deletedAt_idx" ON "customer" USING btree ("deleted_at");