ALTER TABLE "user" ADD COLUMN "first_login_at" timestamp;--> statement-breakpoint
UPDATE "user" u SET "first_login_at" = s.first_at FROM (SELECT "user_id", min("created_at") AS first_at FROM "session" WHERE "impersonated_by" IS NULL GROUP BY "user_id") s WHERE s."user_id" = u."id" AND u."first_login_at" IS NULL;--> statement-breakpoint
UPDATE "user" u SET "first_login_at" = u."created_at" WHERE u."first_login_at" IS NULL AND NOT EXISTS (SELECT 1 FROM "verification" v WHERE v."value" = 'staff-invite:' || u."id");
