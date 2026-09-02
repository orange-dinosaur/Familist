CREATE TABLE "shared_link" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"note" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "shared_link" ADD CONSTRAINT "shared_link_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_link" ADD CONSTRAINT "shared_link_created_by_fk" FOREIGN KEY ("family_id","created_by") REFERENCES "public"."family_member"("family_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shared_link_family_id_idx" ON "shared_link" USING btree ("family_id");