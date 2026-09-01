CREATE TABLE "payment" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"due_on" date NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_on" date,
	"payer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_family_id_family_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."family"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payer_fk" FOREIGN KEY ("family_id","payer_id") REFERENCES "public"."family_member"("family_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_family_id_due_on_idx" ON "payment" USING btree ("family_id","due_on");