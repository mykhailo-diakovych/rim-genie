CREATE TABLE "quote_excluded_service" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"service_id" text,
	"name" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_excluded_service" ADD CONSTRAINT "quote_excluded_service_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_excluded_service" ADD CONSTRAINT "quote_excluded_service_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;