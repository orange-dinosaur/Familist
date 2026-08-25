CREATE TABLE "active_membership" (
	"user_id" text PRIMARY KEY NOT NULL,
	"family_member_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "active_membership" ADD CONSTRAINT "active_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "active_membership" ADD CONSTRAINT "active_membership_family_member_id_family_member_id_fk" FOREIGN KEY ("family_member_id") REFERENCES "public"."family_member"("id") ON DELETE cascade ON UPDATE no action;