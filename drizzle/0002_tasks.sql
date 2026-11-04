CREATE TYPE "public"."task_status" AS ENUM('OPEN', 'DONE', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('PRESOW', 'PRICK_OUT', 'PRESPROUT', 'HARDEN_OFF', 'DIRECT_SOW', 'PLANT_OUT', 'CARE', 'FERTILIZE', 'PRUNE', 'HARVEST', 'CLEAR', 'MANUAL');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"planting_id" integer,
	"bed_id" integer,
	"type" "task_type" NOT NULL,
	"location" "step_location" DEFAULT 'BED' NOT NULL,
	"title_de" text NOT NULL,
	"due_start" date NOT NULL,
	"due_end" date NOT NULL,
	"status" "task_status" DEFAULT 'OPEN' NOT NULL,
	"done_at" date,
	"generated_key" text,
	"notes_de" text,
	CONSTRAINT "tasks_generated_key_unique" UNIQUE("generated_key")
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_due" ON "tasks" USING btree ("due_start","due_end");