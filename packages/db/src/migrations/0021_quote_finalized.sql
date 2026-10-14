ALTER TYPE "public"."quote_status" ADD VALUE 'finalized' BEFORE 'pending';--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "finalized_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "finalized_by_id" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "sent_to_cashier_at" timestamp;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_finalized_by_id_user_id_fk" FOREIGN KEY ("finalized_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;