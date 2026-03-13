CREATE TABLE "terms_signature" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"signature_data_url" text NOT NULL,
	"signed_by_id" text NOT NULL,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "terms_signature_quoteId_unique" UNIQUE("quote_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_config" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"purchase_threshold" integer DEFAULT 5 NOT NULL,
	"spend_threshold" integer DEFAULT 50000 NOT NULL,
	"reward_percent" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN "communication_preference" text DEFAULT 'sms' NOT NULL;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "customer_reason" text;--> statement-breakpoint
ALTER TABLE "quote" ADD COLUMN "full_diagnostic_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "terms_signature" ADD CONSTRAINT "terms_signature_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms_signature" ADD CONSTRAINT "terms_signature_signed_by_id_user_id_fk" FOREIGN KEY ("signed_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;