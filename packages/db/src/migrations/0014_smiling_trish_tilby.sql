ALTER TABLE "user" ADD COLUMN "can_adjust_prices" boolean DEFAULT false NOT NULL;
ALTER TABLE "quote_item" ADD COLUMN "price_overridden" boolean DEFAULT false NOT NULL;
ALTER TABLE "invoice_item" ADD COLUMN "quote_item_id" text;
ALTER TABLE "invoice_item" ADD COLUMN "price_overridden" boolean DEFAULT false NOT NULL;
ALTER TABLE "invoice_item" ADD CONSTRAINT "invoice_item_quote_item_id_quote_item_id_fk" FOREIGN KEY ("quote_item_id") REFERENCES "public"."quote_item"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "invoiceItem_quoteItemId_idx" ON "invoice_item" USING btree ("quote_item_id");