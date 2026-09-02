CREATE TYPE "public"."loan_direction" AS ENUM('lent', 'borrowed');--> statement-breakpoint
CREATE TABLE "loan" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"item" text NOT NULL,
	"direction" "loan_direction" NOT NULL,
	"counterparty" text NOT NULL,
	"member_id" text,
	"day" date NOT NULL,
	"returned" boolean DEFAULT false NOT NULL,
	"returned_on" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan" ADD CONSTRAINT "loan_member_fk" FOREIGN KEY ("family_id","member_id") REFERENCES "public"."family_member"("family_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loan_family_id_idx" ON "loan" USING btree ("family_id");