CREATE TYPE "public"."log_type" AS ENUM('HARVEST', 'NOTE');--> statement-breakpoint
CREATE TYPE "public"."shopping_kind" AS ENUM('SEED', 'SEEDLING', 'SETS', 'GREEN_MANURE');--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"type" "log_type" NOT NULL,
	"bed_id" integer,
	"planting_id" integer,
	"species_id" integer,
	"amount" real,
	"unit" text,
	"text_de" text
);
--> statement-breakpoint
CREATE TABLE "shopping_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"species_id" integer,
	"kind" "shopping_kind",
	"label_de" text NOT NULL,
	"quantity" real,
	"unit" text,
	"detail_de" text,
	"bought" boolean DEFAULT false NOT NULL,
	"generated_key" text
);
--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_planting_id_plantings_id_fk" FOREIGN KEY ("planting_id") REFERENCES "public"."plantings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "log_entries_date" ON "log_entries" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "shopping_items_season_key" ON "shopping_items" USING btree ("season_id","generated_key");