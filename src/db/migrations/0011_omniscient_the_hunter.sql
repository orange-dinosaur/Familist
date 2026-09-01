CREATE TYPE "public"."subscription_cycle" AS ENUM('weekly', 'monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"cycle" "subscription_cycle" NOT NULL,
	"next_renewal" date NOT NULL,
	"payer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_payer_fk" FOREIGN KEY ("family_id","payer_id") REFERENCES "public"."family_member"("family_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_family_id_idx" ON "subscription" USING btree ("family_id");