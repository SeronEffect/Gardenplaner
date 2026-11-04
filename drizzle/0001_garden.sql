CREATE TYPE "public"."bed_type" AS ENUM('FLAT', 'RAISED', 'GREENHOUSE', 'POTS');--> statement-breakpoint
CREATE TYPE "public"."planting_status" AS ENUM('PLANNED', 'ACTIVE', 'DONE');--> statement-breakpoint
CREATE TYPE "public"."quantity_mode" AS ENUM('FULL_ROW', 'COUNT');--> statement-breakpoint
CREATE TYPE "public"."rotation_mode" AS ENUM('STRICT', 'WARN', 'OFF');--> statement-breakpoint
CREATE TYPE "public"."row_direction" AS ENUM('HORIZONTAL', 'VERTICAL');--> statement-breakpoint
CREATE TYPE "public"."season_status" AS ENUM('HISTORY', 'PLANNING', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "beds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "bed_type" DEFAULT 'FLAT' NOT NULL,
	"x_cm" integer DEFAULT 0 NOT NULL,
	"y_cm" integer DEFAULT 0 NOT NULL,
	"length_cm" integer NOT NULL,
	"width_cm" integer NOT NULL,
	"row_direction" "row_direction" DEFAULT 'HORIZONTAL' NOT NULL,
	"rotation_mode" "rotation_mode" DEFAULT 'STRICT' NOT NULL,
	"sun" "light" DEFAULT 'FULL' NOT NULL,
	"soil_de" text,
	"notes_de" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plantings" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"bed_id" integer NOT NULL,
	"species_id" integer NOT NULL,
	"variety_id" integer,
	"route_id" integer,
	"offset_cm" integer NOT NULL,
	"width_cm" integer NOT NULL,
	"quantity_mode" "quantity_mode" DEFAULT 'FULL_ROW' NOT NULL,
	"count" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"sourcing" "sourcing" DEFAULT 'SEED' NOT NULL,
	"status" "planting_status" DEFAULT 'PLANNED' NOT NULL,
	"notes_de" text
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"year" smallint NOT NULL,
	"status" "season_status" NOT NULL,
	CONSTRAINT "seasons_year_unique" UNIQUE("year")
);
--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_variety_id_varieties_id_fk" FOREIGN KEY ("variety_id") REFERENCES "public"."varieties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_route_id_culture_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."culture_routes"("id") ON DELETE set null ON UPDATE no action;