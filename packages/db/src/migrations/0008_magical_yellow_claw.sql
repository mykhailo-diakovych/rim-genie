ALTER TABLE "quote" ADD COLUMN "vip_discount_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "reward_discount_percent" integer DEFAULT 0 NOT NULL;