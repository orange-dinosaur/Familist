CREATE TABLE "chore_definition" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "chore_definition_family_id_id_key" UNIQUE("family_id","id")
);
--> statement-breakpoint
ALTER TABLE "chore" ADD COLUMN "definition_id" text;--> statement-breakpoint
ALTER TABLE "chore_definition" ADD CONSTRAINT "chore_definition_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_definition" ADD CONSTRAINT "chore_definition_creator_fk" FOREIGN KEY ("family_id","created_by") REFERENCES "public"."family_member"("family_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chore_definition_family_id_idx" ON "chore_definition" USING btree ("family_id");--> statement-breakpoint
ALTER TABLE "chore" ADD CONSTRAINT "chore_definition_fk" FOREIGN KEY ("family_id","definition_id") REFERENCES "public"."chore_definition"("family_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
INSERT INTO "chore_definition" ("id", "family_id", "name", "deleted_at")
SELECT
	gen_random_uuid()::text,
	"family_id",
	"label",
	CASE WHEN bool_or("deleted_at" IS NULL) THEN NULL ELSE now() END
FROM "chore"
GROUP BY "family_id", "label";--> statement-breakpoint
UPDATE "chore" SET "definition_id" = "chore_definition"."id"
FROM "chore_definition"
WHERE "chore"."family_id" = "chore_definition"."family_id"
	AND "chore"."label" = "chore_definition"."name";
