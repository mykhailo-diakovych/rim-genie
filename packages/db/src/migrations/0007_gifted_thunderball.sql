CREATE TYPE "public"."quote_vehicle_type" AS ENUM('truck', 'car_suv', 'motorcycle');--> statement-breakpoint
CREATE TYPE "public"."rim_material" AS ENUM('steel', 'aluminum');--> statement-breakpoint
CREATE TYPE "public"."service_category" AS ENUM('rim', 'welding', 'powder_coating', 'general');--> statement-breakpoint
CREATE TABLE "service_price" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "service_category" NOT NULL,
	"job_type" text NOT NULL,
	"vehicle_type" "quote_vehicle_type",
	"rim_material" "rim_material",
	"min_size" integer,
	"max_size" integer,
	"unit_cost" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_item" ADD COLUMN "vehicle_type" "quote_vehicle_type";--> statement-breakpoint
ALTER TABLE "quote_item" ADD COLUMN "rim_material" "rim_material";--> statement-breakpoint
ALTER TABLE "invoice_item" ADD COLUMN "vehicle_type" "quote_vehicle_type";--> statement-breakpoint
ALTER TABLE "invoice_item" ADD COLUMN "rim_material" "rim_material";--> statement-breakpoint
CREATE INDEX "service_price_category_idx" ON "service_price" USING btree ("category");--> statement-breakpoint
CREATE INDEX "service_price_lookup_idx" ON "service_price" USING btree ("category","job_type","vehicle_type","rim_material");