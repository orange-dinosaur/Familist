CREATE TYPE "public"."member_role" AS ENUM('owner', 'editor', 'checker');--> statement-breakpoint
CREATE TABLE "family" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_member" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"color" text NOT NULL,
	"user_id" text,
	"role" "member_role",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "family_member_family_id_id_key" UNIQUE("family_id","id"),
	CONSTRAINT "family_member_account_has_role" CHECK (("family_member"."user_id" is null) = ("family_member"."role" is null))
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"family_member_id" text,
	"role" "member_role" NOT NULL,
	"code" text NOT NULL,
	"email" text,
	"invited_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_member" ADD CONSTRAINT "family_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_family_member_fk" FOREIGN KEY ("family_id","family_member_id") REFERENCES "public"."family_member"("family_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "family_member_family_id_idx" ON "family_member" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "family_member_family_id_user_id_idx" ON "family_member" USING btree ("family_id","user_id");--> statement-breakpoint
CREATE INDEX "invitation_family_id_idx" ON "invitation" USING btree ("family_id");