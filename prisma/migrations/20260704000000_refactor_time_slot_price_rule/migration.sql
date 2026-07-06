DO $$ BEGIN
  CREATE TYPE "TimeSlotLabel" AS ENUM ('REGULAR', 'PEAK', 'LATE_NIGHT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "field_operating_hours" RENAME TO "field_time_slots";
ALTER TABLE "field_time_slots" RENAME COLUMN "open_time" TO "start_time";
ALTER TABLE "field_time_slots" RENAME COLUMN "close_time" TO "end_time";

ALTER TABLE "field_time_slots"
  ADD COLUMN IF NOT EXISTS "label" "TimeSlotLabel" NOT NULL DEFAULT 'REGULAR',
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "field_time_slots" DROP CONSTRAINT IF EXISTS "field_operating_hours_field_yard_id_day_of_week_key";
ALTER TABLE "field_time_slots" DROP CONSTRAINT IF EXISTS "field_time_slots_field_yard_id_day_of_week_key";

DROP INDEX IF EXISTS "field_operating_hours_field_yard_id_day_of_week_key";
CREATE INDEX IF NOT EXISTS "field_time_slots_field_yard_id_day_of_week_idx"
  ON "field_time_slots"("field_yard_id", "day_of_week");

ALTER TABLE "field_price_rules" ADD COLUMN IF NOT EXISTS "time_slot_id" TEXT;

UPDATE "field_price_rules" pr
SET "time_slot_id" = ts."id"
FROM "field_time_slots" ts
WHERE pr."time_slot_id" IS NULL
  AND pr."field_yard_id" = ts."field_yard_id"
  AND pr."day_of_week" = ts."day_of_week"
  AND pr."start_time" = ts."start_time"
  AND pr."end_time" = ts."end_time";

INSERT INTO "field_time_slots" (
  "id", "field_yard_id", "day_of_week", "start_time", "end_time", "label", "sort_order", "created_at", "updated_at", "deleted_at"
)
SELECT gen_random_uuid()::text, pr."field_yard_id", COALESCE(pr."day_of_week", 0), pr."start_time", pr."end_time",
  CASE WHEN pr."label" IN ('REGULAR', 'PEAK', 'LATE_NIGHT')
    THEN pr."label"::"TimeSlotLabel"
    ELSE 'REGULAR'::"TimeSlotLabel"
  END,
  0, now(), now(), pr."deleted_at"
FROM "field_price_rules" pr
WHERE pr."time_slot_id" IS NULL;

UPDATE "field_price_rules" pr
SET "time_slot_id" = ts."id"
FROM "field_time_slots" ts
WHERE pr."time_slot_id" IS NULL
  AND pr."field_yard_id" = ts."field_yard_id"
  AND COALESCE(pr."day_of_week", 0) = ts."day_of_week"
  AND pr."start_time" = ts."start_time"
  AND pr."end_time" = ts."end_time";

ALTER TABLE "field_price_rules" ALTER COLUMN "time_slot_id" SET NOT NULL;

ALTER TABLE "field_price_rules" DROP CONSTRAINT IF EXISTS "field_price_rules_field_yard_id_fkey";
ALTER TABLE "field_price_rules"
  ADD CONSTRAINT "field_price_rules_time_slot_id_fkey"
  FOREIGN KEY ("time_slot_id") REFERENCES "field_time_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "field_price_rules"
  DROP COLUMN IF EXISTS "field_yard_id",
  DROP COLUMN IF EXISTS "day_of_week",
  DROP COLUMN IF EXISTS "start_time",
  DROP COLUMN IF EXISTS "end_time",
  DROP COLUMN IF EXISTS "label";

DROP INDEX IF EXISTS "field_price_rules_field_yard_id_day_of_week_special_date_idx";
CREATE INDEX IF NOT EXISTS "field_price_rules_time_slot_id_special_date_idx"
  ON "field_price_rules"("time_slot_id", "special_date");
