CREATE TABLE "user_location" (
	"user_id" text NOT NULL,
	"location_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_location_user_id_location_id_pk" PRIMARY KEY("user_id","location_id")
);
--> statement-breakpoint
ALTER TABLE "user_location" ADD CONSTRAINT "user_location_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_location" ADD CONSTRAINT "user_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_location_user_id_idx" ON "user_location" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_location_location_id_idx" ON "user_location" USING btree ("location_id");--> statement-breakpoint
INSERT INTO "user_location" ("user_id", "location_id")
SELECT "id", "location_id" FROM "user" WHERE "location_id" IS NOT NULL
ON CONFLICT DO NOTHING;