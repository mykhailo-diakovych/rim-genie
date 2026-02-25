CREATE TYPE "public"."notification_type" AS ENUM('inventory_discrepancy', 'discount_request', 'discount_approved', 'discount_rejected', 'job_completed');--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"recipient_id" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"reference_id" text,
	"reference_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "subtotal" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_item" ADD COLUMN "item_type" text DEFAULT 'rim' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_item" ADD COLUMN "inches" integer;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD COLUMN "item_type" text DEFAULT 'rim' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_item" ADD COLUMN "inches" integer;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_recipientId_idx" ON "notification" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "notification_isRead_idx" ON "notification" USING btree ("recipient_id","is_read");--> statement-breakpoint
CREATE INDEX "notification_createdAt_idx" ON "notification" USING btree ("created_at");