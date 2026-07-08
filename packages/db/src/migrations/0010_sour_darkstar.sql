CREATE TYPE "public"."brake_unit" AS ENUM('single', 'pair');--> statement-breakpoint
CREATE TYPE "public"."job_type_section" AS ENUM('rims', 'tire-service', 'brake-service', 'other-welding', 'powder-coating', 'spot-polish');--> statement-breakpoint
CREATE TYPE "public"."powder_coat_scope" AS ENUM('set', 'rim');--> statement-breakpoint
CREATE TYPE "public"."spot_polish_size" AS ENUM('le20', 'ge21');--> statement-breakpoint
CREATE TABLE "brake_service_price" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_size_id" text NOT NULL,
	"unit" "brake_unit" NOT NULL,
	"removal_included" boolean DEFAULT false NOT NULL,
	"unit_cost" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brake_service_price_combo_unique" UNIQUE("vehicle_size_id","unit","removal_included")
);
--> statement-breakpoint
CREATE TABLE "job_type" (
	"id" text PRIMARY KEY NOT NULL,
	"category" "service_category" NOT NULL,
	"section" "job_type_section" NOT NULL,
	"parent_id" text,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_type_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "job_type_exclusion" (
	"id" text PRIMARY KEY NOT NULL,
	"job_type_a_id" text NOT NULL,
	"job_type_b_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_type_exclusion_pair_unique" UNIQUE("job_type_a_id","job_type_b_id")
);
--> statement-breakpoint
CREATE TABLE "powder_coat_color" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"hex" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "powder_coat_color_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "powder_coat_price" (
	"id" text PRIMARY KEY NOT NULL,
	"min_size" integer NOT NULL,
	"max_size" integer NOT NULL,
	"scope" "powder_coat_scope" NOT NULL,
	"color_count" integer NOT NULL,
	"unit_cost" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "powder_coat_price_combo_unique" UNIQUE("min_size","max_size","scope","color_count")
);
--> statement-breakpoint
CREATE TABLE "pricing_config" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"steel_discount_percent" integer DEFAULT 20 NOT NULL,
	"truck_markup_percent" integer DEFAULT 20 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spot_polish_price" (
	"id" text PRIMARY KEY NOT NULL,
	"job_type_key" text NOT NULL,
	"size_bucket" "spot_polish_size" NOT NULL,
	"unit_cost" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "spot_polish_price_combo_unique" UNIQUE("job_type_key","size_bucket")
);
--> statement-breakpoint
CREATE TABLE "vehicle_size" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicle_size_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
ALTER TABLE "brake_service_price" ADD CONSTRAINT "brake_service_price_vehicle_size_id_vehicle_size_id_fk" FOREIGN KEY ("vehicle_size_id") REFERENCES "public"."vehicle_size"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_type" ADD CONSTRAINT "job_type_parent_id_job_type_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."job_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_type_exclusion" ADD CONSTRAINT "job_type_exclusion_job_type_a_id_job_type_id_fk" FOREIGN KEY ("job_type_a_id") REFERENCES "public"."job_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_type_exclusion" ADD CONSTRAINT "job_type_exclusion_job_type_b_id_job_type_id_fk" FOREIGN KEY ("job_type_b_id") REFERENCES "public"."job_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brake_service_price_vehicle_idx" ON "brake_service_price" USING btree ("vehicle_size_id");--> statement-breakpoint
CREATE INDEX "job_type_category_idx" ON "job_type" USING btree ("category");--> statement-breakpoint
CREATE INDEX "job_type_section_idx" ON "job_type" USING btree ("section");--> statement-breakpoint
CREATE INDEX "job_type_parent_idx" ON "job_type" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "job_type_exclusion_a_idx" ON "job_type_exclusion" USING btree ("job_type_a_id");--> statement-breakpoint
CREATE INDEX "job_type_exclusion_b_idx" ON "job_type_exclusion" USING btree ("job_type_b_id");--> statement-breakpoint
CREATE INDEX "powder_coat_price_size_idx" ON "powder_coat_price" USING btree ("min_size","max_size");--> statement-breakpoint
CREATE INDEX "spot_polish_price_jobtype_idx" ON "spot_polish_price" USING btree ("job_type_key");