ALTER TABLE "quote" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "location_id" text;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quote_locationId_idx" ON "quote" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "invoice_locationId_idx" ON "invoice" USING btree ("location_id");--> statement-breakpoint
-- Backfill: rows created before the branch was recorded. The creator's profile
-- location is the only signal available retrospectively — it is the same value the
-- old filter used, so this preserves existing visibility rather than changing it.
-- Only NULLs are touched.
UPDATE "quote" q
SET "location_id" = u."location_id"
FROM "user" u
WHERE u."id" = q."created_by_id"
  AND q."location_id" IS NULL
  AND u."location_id" IS NOT NULL;--> statement-breakpoint
-- Invoices take the branch from their originating quote, matching how new invoices
-- are stamped, so a quote and its invoice can never disagree.
UPDATE "invoice" i
SET "location_id" = q."location_id"
FROM "quote" q
WHERE q."id" = i."quote_id"
  AND i."location_id" IS NULL
  AND q."location_id" IS NOT NULL;
