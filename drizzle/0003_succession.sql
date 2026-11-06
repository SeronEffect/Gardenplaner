CREATE TABLE "succession_series" (
	"id" serial PRIMARY KEY NOT NULL,
	"bed_id" integer NOT NULL,
	"species_id" integer NOT NULL,
	"interval_days" smallint NOT NULL,
	"count" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plantings" ADD COLUMN "succession_series_id" integer;--> statement-breakpoint
ALTER TABLE "succession_series" ADD CONSTRAINT "succession_series_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "succession_series" ADD CONSTRAINT "succession_series_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_succession_series_id_succession_series_id_fk" FOREIGN KEY ("succession_series_id") REFERENCES "public"."succession_series"("id") ON DELETE set null ON UPDATE no action;