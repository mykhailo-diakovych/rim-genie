ALTER TABLE "quote_item" ADD COLUMN "is_excluded" boolean DEFAULT false NOT NULL;--> statement-breakpoint
INSERT INTO "quote_item" (
  "id",
  "quote_id",
  "item_type",
  "quantity",
  "unit_cost",
  "description",
  "is_excluded",
  "sort_order",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid()::text,
  es."quote_id",
  'rim',
  1,
  es."price",
  es."name",
  true,
  COALESCE(mx."max_sort", -1)
    + ROW_NUMBER() OVER (PARTITION BY es."quote_id" ORDER BY es."created_at", es."id"),
  es."created_at",
  es."updated_at"
FROM "quote_excluded_service" es
LEFT JOIN (
  SELECT "quote_id", MAX("sort_order") AS "max_sort"
  FROM "quote_item"
  GROUP BY "quote_id"
) mx ON mx."quote_id" = es."quote_id";--> statement-breakpoint
DROP TABLE "quote_excluded_service" CASCADE;
