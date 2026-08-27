INSERT INTO "chore_definition" ("id", "family_id", "name")
SELECT gen_random_uuid()::text, c."family_id", c."label"
FROM "chore" c
WHERE c."definition_id" IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM "chore_definition" d
		WHERE d."family_id" = c."family_id"
			AND d."name" = c."label"
			AND d."deleted_at" IS NULL
	)
GROUP BY c."family_id", c."label";--> statement-breakpoint
UPDATE "chore" SET "definition_id" = "chore_definition"."id"
FROM "chore_definition"
WHERE "chore"."definition_id" IS NULL
	AND "chore"."family_id" = "chore_definition"."family_id"
	AND "chore"."label" = "chore_definition"."name"
	AND "chore_definition"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "chore" ALTER COLUMN "definition_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chore" DROP COLUMN "label";
