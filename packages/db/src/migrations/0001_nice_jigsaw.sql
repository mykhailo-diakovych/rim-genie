CREATE TYPE "public"."vehicle_type" AS ENUM('car', 'suv', 'truck', 'van');--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "vehicle_type" "vehicle_type";