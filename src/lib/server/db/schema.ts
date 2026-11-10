// Database schema. Phase 1: plant knowledge + settings. Phase 2: beds, seasons, plantings.
// Phase 3: tasks. Phase 4: succession series. Phase 5: shopping list, diary.
// Later phases (tasks, log, sensors …) follow the spec, see docs/P0-Spezifikation.md §3 and §8.
import {
	boolean,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	real,
	serial,
	smallint,
	text,
	uniqueIndex
} from 'drizzle-orm/pg-core';

export const feedingType = pgEnum('feeding_type', ['HEAVY', 'MEDIUM', 'LIGHT', 'NONE']);
export const lifecycle = pgEnum('lifecycle', ['ANNUAL', 'PERENNIAL']);
export const toxicityLevel = pgEnum('toxicity_level', ['NONE', 'CAUTION', 'TOXIC']);
export const sourcing = pgEnum('sourcing', ['SEED', 'SEEDLING', 'SETS', 'EXISTING']);
export const level = pgEnum('level', ['LOW', 'MEDIUM', 'HIGH']);
export const light = pgEnum('light', ['FULL', 'PARTIAL', 'SHADE']);
export const stepType = pgEnum('step_type', [
	'PRESOW',
	'PRICK_OUT',
	'PRESPROUT',
	'HARDEN_OFF',
	'DIRECT_SOW',
	'PLANT_OUT',
	'CARE',
	'FERTILIZE',
	'PRUNE',
	'HARVEST',
	'CLEAR'
]);
export const stepLocation = pgEnum('step_location', ['WINDOWSILL', 'GREENHOUSE', 'BED']);
export const anchor = pgEnum('anchor', [
	'LAST_FROST',
	'FIRST_FROST',
	'PLANTING_START',
	'PREV_STEP',
	'FIXED_MMDD'
]);
export const relation = pgEnum('relation', ['GOOD', 'BAD']);

/** Single-row table (id = 1). */
export const settings = pgTable('settings', {
	id: smallint('id').primaryKey().default(1),
	gardenName: text('garden_name').notNull().default('Mein Garten'),
	lat: real('lat'),
	lon: real('lon'),
	/** MM-DD */
	lastFrost: text('last_frost').notNull().default('05-15'),
	/** MM-DD */
	firstFrost: text('first_frost').notNull().default('10-15')
});

export const families = pgTable('families', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	nameDe: text('name_de').notNull(),
	nameLat: text('name_lat').notNull(),
	rotationPauseYears: smallint('rotation_pause_years').notNull().default(3),
	sourceRef: text('source_ref')
});

export const species = pgTable('species', {
	id: serial('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	nameDe: text('name_de').notNull(),
	nameLat: text('name_lat').notNull(),
	familyId: integer('family_id')
		.notNull()
		.references(() => families.id),
	feedingType: feedingType('feeding_type').notNull(),
	lifecycle: lifecycle('lifecycle').notNull(),
	lifespanYears: smallint('lifespan_years'),
	heightMinCm: smallint('height_min_cm'),
	heightMaxCm: smallint('height_max_cm'),
	widthCm: smallint('width_cm'),
	rowSpacingCm: smallint('row_spacing_cm'),
	inRowSpacingCm: smallint('in_row_spacing_cm'),
	toxicityLevel: toxicityLevel('toxicity_level').notNull().default('NONE'),
	toxicityDe: text('toxicity_de'),
	careDe: text('care_de'),
	storageDe: text('storage_de'),
	fertilizeIntervalDays: smallint('fertilize_interval_days'),
	defaultSourcing: sourcing('default_sourcing').notNull().default('SEED'),
	setWeightG: smallint('set_weight_g'),
	outdoor: boolean('outdoor').notNull().default(true),
	greenhouse: boolean('greenhouse').notNull().default(false),
	isGreenManure: boolean('is_green_manure').notNull().default(false),
	// Environment fields (used from P7 on, see spec §8.2)
	germTempMinC: smallint('germ_temp_min_c'),
	germTempMaxC: smallint('germ_temp_max_c'),
	minTempC: smallint('min_temp_c'),
	minSoilTempSowC: smallint('min_soil_temp_sow_c'),
	soilMoisture: level('soil_moisture'),
	light: light('light'),
	ghMaxTempC: smallint('gh_max_temp_c'),
	// Picture (Wikimedia Commons)
	imageUrl: text('image_url'),
	imageCredit: text('image_credit'),
	imageLicense: text('image_license'),
	imagePageUrl: text('image_page_url'),
	sourceRef: text('source_ref')
});

export const varieties = pgTable(
	'varieties',
	{
		id: serial('id').primaryKey(),
		speciesId: integer('species_id')
			.notNull()
			.references(() => species.id, { onDelete: 'cascade' }),
		nameDe: text('name_de').notNull(),
		daysToMaturity: smallint('days_to_maturity'),
		notesDe: text('notes_de')
	},
	(t) => [uniqueIndex('varieties_species_name').on(t.speciesId, t.nameDe)]
);

export const cultureRoutes = pgTable(
	'culture_routes',
	{
		id: serial('id').primaryKey(),
		speciesId: integer('species_id')
			.notNull()
			.references(() => species.id, { onDelete: 'cascade' }),
		slug: text('slug').notNull(),
		nameDe: text('name_de').notNull(),
		isDefault: boolean('is_default').notNull().default(false),
		sortOrder: smallint('sort_order').notNull().default(0)
	},
	(t) => [uniqueIndex('culture_routes_species_slug').on(t.speciesId, t.slug)]
);

export const cultureSteps = pgTable('culture_steps', {
	id: serial('id').primaryKey(),
	routeId: integer('route_id')
		.notNull()
		.references(() => cultureRoutes.id, { onDelete: 'cascade' }),
	sortOrder: smallint('sort_order').notNull(),
	type: stepType('type').notNull(),
	location: stepLocation('location').notNull(),
	anchor: anchor('anchor').notNull(),
	/** Only for anchor FIXED_MMDD: MM-DD the offsets refer to */
	fixedMmdd: text('fixed_mmdd'),
	offsetStartDays: smallint('offset_start_days').notNull(),
	offsetEndDays: smallint('offset_end_days').notNull(),
	repeatEveryDays: smallint('repeat_every_days'),
	labelDe: text('label_de').notNull(),
	isPlantingStart: boolean('is_planting_start').notNull().default(false),
	isPlantingEnd: boolean('is_planting_end').notNull().default(false),
	sourceRef: text('source_ref')
});

export const companions = pgTable(
	'companions',
	{
		/** Always the smaller id of the pair */
		speciesAId: integer('species_a_id')
			.notNull()
			.references(() => species.id, { onDelete: 'cascade' }),
		speciesBId: integer('species_b_id')
			.notNull()
			.references(() => species.id, { onDelete: 'cascade' }),
		relation: relation('relation').notNull(),
		reasonDe: text('reason_de'),
		sourceRef: text('source_ref')
	},
	(t) => [primaryKey({ columns: [t.speciesAId, t.speciesBId] })]
);

// ── Phase 2: garden – beds, seasons, plantings (spec §3) ────────────────────
export const bedType = pgEnum('bed_type', ['FLAT', 'RAISED', 'GREENHOUSE', 'POTS']);
export const rowDirection = pgEnum('row_direction', ['HORIZONTAL', 'VERTICAL']);
export const rotationMode = pgEnum('rotation_mode', ['STRICT', 'WARN', 'OFF']);
export const seasonStatus = pgEnum('season_status', ['HISTORY', 'PLANNING', 'ACTIVE', 'ARCHIVED']);
export const quantityMode = pgEnum('quantity_mode', ['FULL_ROW', 'COUNT']);
export const plantingStatus = pgEnum('planting_status', ['PLANNED', 'ACTIVE', 'DONE']);

export const beds = pgTable('beds', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	type: bedType('type').notNull().default('FLAT'),
	/** Position of the top-left corner on the garden map */
	xCm: integer('x_cm').notNull().default(0),
	yCm: integer('y_cm').notNull().default(0),
	/** Rows run along the length */
	lengthCm: integer('length_cm').notNull(),
	/** Rows are stacked across the width */
	widthCm: integer('width_cm').notNull(),
	/** HORIZONTAL: rows (length) run left–right on the map */
	rowDirection: rowDirection('row_direction').notNull().default('HORIZONTAL'),
	rotationMode: rotationMode('rotation_mode').notNull().default('STRICT'),
	sun: light('sun').notNull().default('FULL'),
	soilDe: text('soil_de'),
	notesDe: text('notes_de'),
	active: boolean('active').notNull().default(true),
	sortOrder: smallint('sort_order').notNull().default(0)
});

export const seasons = pgTable('seasons', {
	id: serial('id').primaryKey(),
	year: smallint('year').notNull().unique(),
	status: seasonStatus('status').notNull()
});

export const plantings = pgTable('plantings', {
	id: serial('id').primaryKey(),
	/** Season the planting was planned in (perennials stay visible in later seasons via their dates) */
	seasonId: integer('season_id')
		.notNull()
		.references(() => seasons.id, { onDelete: 'cascade' }),
	bedId: integer('bed_id')
		.notNull()
		.references(() => beds.id, { onDelete: 'cascade' }),
	speciesId: integer('species_id')
		.notNull()
		.references(() => species.id),
	varietyId: integer('variety_id').references(() => varieties.id, { onDelete: 'set null' }),
	routeId: integer('route_id').references(() => cultureRoutes.id, { onDelete: 'set null' }),
	/** Position across the bed, from the top/left edge */
	offsetCm: integer('offset_cm').notNull(),
	/** Space the row takes across the bed (default: species row spacing) */
	widthCm: integer('width_cm').notNull(),
	quantityMode: quantityMode('quantity_mode').notNull().default('FULL_ROW'),
	count: integer('count'),
	/** Time the row is taken in the bed (ISO date) */
	startDate: date('start_date', { mode: 'string' }).notNull(),
	endDate: date('end_date', { mode: 'string' }).notNull(),
	sourcing: sourcing('sourcing').notNull().default('SEED'),
	status: plantingStatus('status').notNull().default('PLANNED'),
	/** Set when the planting is one set of a succession series (phase 4) */
	successionSeriesId: integer('succession_series_id').references(() => successionSeries.id, { onDelete: 'set null' }),
	notesDe: text('notes_de')
});

// ── Phase 4: succession growing (spec §3 SuccessionSeries, §4.6) ───────────
export const successionSeries = pgTable('succession_series', {
	id: serial('id').primaryKey(),
	bedId: integer('bed_id')
		.notNull()
		.references(() => beds.id, { onDelete: 'cascade' }),
	speciesId: integer('species_id')
		.notNull()
		.references(() => species.id),
	intervalDays: smallint('interval_days').notNull(),
	count: smallint('count').notNull()
});

// ── Phase 3: tasks (spec §3, §4.4) ──────────────────────────────────────────
export const taskType = pgEnum('task_type', [
	'PRESOW',
	'PRICK_OUT',
	'PRESPROUT',
	'HARDEN_OFF',
	'DIRECT_SOW',
	'PLANT_OUT',
	'CARE',
	'FERTILIZE',
	'PRUNE',
	'HARVEST',
	'CLEAR',
	'MANUAL'
]);
export const taskStatus = pgEnum('task_status', ['OPEN', 'DONE', 'SKIPPED']);

export const tasks = pgTable(
	'tasks',
	{
		id: serial('id').primaryKey(),
		plantingId: integer('planting_id').references(() => plantings.id, { onDelete: 'cascade' }),
		bedId: integer('bed_id').references(() => beds.id, { onDelete: 'cascade' }),
		type: taskType('type').notNull(),
		location: stepLocation('location').notNull().default('BED'),
		titleDe: text('title_de').notNull(),
		dueStart: date('due_start', { mode: 'string' }).notNull(),
		dueEnd: date('due_end', { mode: 'string' }).notNull(),
		status: taskStatus('status').notNull().default('OPEN'),
		doneAt: date('done_at', { mode: 'string' }),
		/** Set for generated tasks (see rules/tasks.ts); null = added by hand */
		generatedKey: text('generated_key').unique(),
		notesDe: text('notes_de')
	},
	(t) => [index('tasks_due').on(t.dueStart, t.dueEnd)]
);

// ── Phase 5: shopping list and diary (spec §3, §4.7, §4.9) ──────────────────
export const shoppingKind = pgEnum('shopping_kind', ['SEED', 'SEEDLING', 'SETS', 'GREEN_MANURE']);

export const shoppingItems = pgTable(
	'shopping_items',
	{
		id: serial('id').primaryKey(),
		seasonId: integer('season_id')
			.notNull()
			.references(() => seasons.id, { onDelete: 'cascade' }),
		/** Null for manual entries */
		speciesId: integer('species_id').references(() => species.id, { onDelete: 'set null' }),
		kind: shoppingKind('kind'),
		labelDe: text('label_de').notNull(),
		quantity: real('quantity'),
		unit: text('unit'),
		detailDe: text('detail_de'),
		bought: boolean('bought').notNull().default(false),
		/** `<speciesId>:<kind>` for generated lines (see rules/shopping.ts); null = added by hand */
		generatedKey: text('generated_key')
	},
	(t) => [uniqueIndex('shopping_items_season_key').on(t.seasonId, t.generatedKey)]
);

export const logType = pgEnum('log_type', ['HARVEST', 'NOTE']);

export const logEntries = pgTable(
	'log_entries',
	{
		id: serial('id').primaryKey(),
		date: date('date', { mode: 'string' }).notNull(),
		type: logType('type').notNull(),
		bedId: integer('bed_id').references(() => beds.id, { onDelete: 'set null' }),
		plantingId: integer('planting_id').references(() => plantings.id, { onDelete: 'set null' }),
		/** Copied from the planting so harvests still count when the row is deleted */
		speciesId: integer('species_id').references(() => species.id, { onDelete: 'set null' }),
		amount: real('amount'),
		/** kg | Stück | Bund */
		unit: text('unit'),
		textDe: text('text_de')
	},
	(t) => [index('log_entries_date').on(t.date)]
);
