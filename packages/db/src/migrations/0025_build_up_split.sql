INSERT INTO "job_type" ("id", "category", "section", "parent_id", "key", "label", "config", "sort_order")
SELECT gen_random_uuid()::text, g."category", g."section", g."id", o."key", o."label", '{}'::jsonb, o."sort_order"
FROM "job_type" g
CROSS JOIN (VALUES
  ('build-up-edge-back', 'Edge Back', 0),
  ('build-up-edge-front', 'Edge Front', 1),
  ('build-up-sprong', 'Sprong', 2),
  ('build-up-hole', 'Hole', 3)
) AS o("key", "label", "sort_order")
WHERE g."key" = 'build-up' AND g."parent_id" IS NULL
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
INSERT INTO "service_price" ("id", "category", "job_type", "vehicle_type", "rim_material", "min_size", "max_size", "unit_cost")
SELECT gen_random_uuid()::text, p."category", o."key", p."vehicle_type", p."rim_material", p."min_size", p."max_size", p."unit_cost"
FROM "service_price" p
CROSS JOIN (VALUES ('build-up-edge-back'), ('build-up-edge-front'), ('build-up-sprong'), ('build-up-hole')) AS o("key")
WHERE p."job_type" = 'edge-back-edge-front-sprong-hole'
  AND EXISTS (SELECT 1 FROM "job_type" j WHERE j."key" = o."key")
  AND NOT EXISTS (SELECT 1 FROM "service_price" e WHERE e."job_type" = o."key");--> statement-breakpoint
UPDATE "job_type" SET "is_active" = false WHERE "key" = 'edge-back-edge-front-sprong-hole' AND "is_active" = true
  AND EXISTS (SELECT 1 FROM "job_type" j WHERE j."key" = 'build-up-edge-back');
