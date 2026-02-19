CREATE TYPE "public"."user_role" AS ENUM('admin', 'floorManager', 'cashier', 'technician', 'inventoryClerk');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"birthday_day" integer,
	"birthday_month" integer,
	"is_vip" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "quote" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_number" serial NOT NULL,
	"customer_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"job_rack" text,
	"comments" text,
	"valid_until" timestamp,
	"total" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_item" (
	"id" text PRIMARY KEY NOT NULL,
	"quote_id" text NOT NULL,
	"vehicle_size" text,
	"side_of_vehicle" text,
	"damage_level" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"job_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"comments" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role";--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote" ADD CONSTRAINT "quote_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_item" ADD CONSTRAINT "quote_item_quote_id_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quote"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_phone_idx" ON "customer" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "quote_customerId_idx" ON "quote" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quote_createdById_idx" ON "quote" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "quote_status_idx" ON "quote" USING btree ("status");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_username_unique" UNIQUE("username");