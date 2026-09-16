CREATE TYPE "public"."quote_discount_type" AS ENUM('percent', 'fixed');
ALTER TABLE "quote" ADD COLUMN "discount_type" "quote_discount_type" DEFAULT 'percent' NOT NULL;
ALTER TABLE "quote" ADD COLUMN "discount_fixed_cents" integer DEFAULT 0 NOT NULL;