CREATE TYPE "public"."anchor" AS ENUM('LAST_FROST', 'FIRST_FROST', 'PLANTING_START', 'PREV_STEP', 'FIXED_MMDD');--> statement-breakpoint
CREATE TYPE "public"."feeding_type" AS ENUM('HEAVY', 'MEDIUM', 'LIGHT', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."lifecycle" AS ENUM('ANNUAL', 'PERENNIAL');--> statement-breakpoint
CREATE TYPE "public"."light" AS ENUM('FULL', 'PARTIAL', 'SHADE');--> statement-breakpoint
CREATE TYPE "public"."relation" AS ENUM('GOOD', 'BAD');--> statement-breakpoint
CREATE TYPE "public"."sourcing" AS ENUM('SEED', 'SEEDLING', 'SETS', 'EXISTING');--> statement-breakpoint
CREATE TYPE "public"."step_location" AS ENUM('WINDOWSILL', 'GREENHOUSE', 'BED');--> statement-breakpoint
CREATE TYPE "public"."step_type" AS ENUM('PRESOW', 'PRICK_OUT', 'PRESPROUT', 'HARDEN_OFF', 'DIRECT_SOW', 'PLANT_OUT', 'CARE', 'FERTILIZE', 'PRUNE', 'HARVEST', 'CLEAR');--> statement-breakpoint
CREATE TYPE "public"."toxicity_level" AS ENUM('NONE', 'CAUTION', 'TOXIC');--> statement-breakpoint
CREATE TABLE "companions" (
	"species_a_id" integer NOT NULL,
	"species_b_id" integer NOT NULL,
	"relation" "relation" NOT NULL,
	"reason_de" text,
	"source_ref" text,
	CONSTRAINT "companions_species_a_id_species_b_id_pk" PRIMARY KEY("species_a_id","species_b_id")
);
--> statement-breakpoint
CREATE TABLE "culture_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"species_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name_de" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "culture_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer NOT NULL,
	"sort_order" smallint NOT NULL,
	"type" "step_type" NOT NULL,
	"location" "step_location" NOT NULL,
	"anchor" "anchor" NOT NULL,
	"fixed_mmdd" text,
	"offset_start_days" smallint NOT NULL,
	"offset_end_days" smallint NOT NULL,
	"repeat_every_days" smallint,
	"label_de" text NOT NULL,
	"is_planting_start" boolean DEFAULT false NOT NULL,
	"is_planting_end" boolean DEFAULT false NOT NULL,
	"source_ref" text
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_de" text NOT NULL,
	"name_lat" text NOT NULL,
	"rotation_pause_years" smallint DEFAULT 3 NOT NULL,
	"source_ref" text,
	CONSTRAINT "families_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"garden_name" text DEFAULT 'Mein Garten' NOT NULL,
	"lat" real,
	"lon" real,
	"last_frost" text DEFAULT '05-15' NOT NULL,
	"first_frost" text DEFAULT '10-15' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_de" text NOT NULL,
	"name_lat" text NOT NULL,
	"family_id" integer NOT NULL,
	"feeding_type" "feeding_type" NOT NULL,
	"lifecycle" "lifecycle" NOT NULL,
	"lifespan_years" smallint,
	"height_min_cm" smallint,
	"height_max_cm" smallint,
	"width_cm" smallint,
	"row_spacing_cm" smallint,
	"in_row_spacing_cm" smallint,
	"toxicity_level" "toxicity_level" DEFAULT 'NONE' NOT NULL,
	"toxicity_de" text,
	"care_de" text,
	"storage_de" text,
	"fertilize_interval_days" smallint,
	"default_sourcing" "sourcing" DEFAULT 'SEED' NOT NULL,
	"set_weight_g" smallint,
	"outdoor" boolean DEFAULT true NOT NULL,
	"greenhouse" boolean DEFAULT false NOT NULL,
	"is_green_manure" boolean DEFAULT false NOT NULL,
	"germ_temp_min_c" smallint,
	"germ_temp_max_c" smallint,
	"min_temp_c" smallint,
	"min_soil_temp_sow_c" smallint,
	"soil_moisture" "level",
	"light" "light",
	"gh_max_temp_c" smallint,
	"image_url" text,
	"image_credit" text,
	"image_license" text,
	"image_page_url" text,
	"source_ref" text,
	CONSTRAINT "species_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "varieties" (
	"id" serial PRIMARY KEY NOT NULL,
	"species_id" integer NOT NULL,
	"name_de" text NOT NULL,
	"days_to_maturity" smallint,
	"notes_de" text
);
--> statement-breakpoint
ALTER TABLE "companions" ADD CONSTRAINT "companions_species_a_id_species_id_fk" FOREIGN KEY ("species_a_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companions" ADD CONSTRAINT "companions_species_b_id_species_id_fk" FOREIGN KEY ("species_b_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "culture_routes" ADD CONSTRAINT "culture_routes_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "culture_steps" ADD CONSTRAINT "culture_steps_route_id_culture_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."culture_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "varieties" ADD CONSTRAINT "varieties_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "culture_routes_species_slug" ON "culture_routes" USING btree ("species_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "varieties_species_name" ON "varieties" USING btree ("species_id","name_de");