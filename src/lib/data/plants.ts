// Plant reference data (spec §5). Values come from the sources in sources.ts;
// every species, step and neighbour pair carries a `sourceRef`.
// Calendar dates from the sources are written as MM-DD and converted to offsets
// from the frost dates (default 15.05 / 15.10), so they move with the frost settings.
import { DEFAULT_FROST, offsetFrom, type Anchor, type StepLocation, type StepType } from '../rules/timeline.ts';

export interface StepData {
	type: StepType;
	location: StepLocation;
	anchor: Anchor;
	fixedMmdd?: string;
	offsetStartDays: number;
	offsetEndDays: number;
	repeatEveryDays?: number;
	labelDe: string;
	isPlantingStart?: boolean;
	isPlantingEnd?: boolean;
	sourceRef: string;
}

export interface RouteData {
	slug: string;
	nameDe: string;
	isDefault?: boolean;
	steps: StepData[];
}

export interface FamilyData {
	slug: string;
	nameDe: string;
	nameLat: string;
	rotationPauseYears: number;
	sourceRef?: string;
}

export interface SpeciesData {
	slug: string;
	nameDe: string;
	nameLat: string;
	family: string;
	feedingType: 'HEAVY' | 'MEDIUM' | 'LIGHT' | 'NONE';
	lifecycle: 'ANNUAL' | 'PERENNIAL';
	lifespanYears?: number;
	rowSpacingCm?: number;
	inRowSpacingCm?: number;
	toxicityLevel?: 'NONE' | 'CAUTION' | 'TOXIC';
	toxicityDe?: string;
	careDe?: string;
	storageDe?: string;
	defaultSourcing?: 'SEED' | 'SEEDLING' | 'SETS' | 'EXISTING';
	outdoor?: boolean;
	greenhouse?: boolean;
	isGreenManure?: boolean;
	/** Rough height range of the crop (varieties differ a lot), used for "tall plants on the north side" */
	heightMinCm?: number;
	heightMaxCm?: number;
	/** Weight of one seed potato / set, for the shopping list (kg = plants × setWeightG) */
	setWeightG?: number;
	germTempMinC?: number;
	germTempMaxC?: number;
	minSoilTempSowC?: number;
	/** German Wikipedia article used to look up the picture */
	wikiTitle: string;
	sourceRef: string;
	routes: RouteData[];
}

export interface CompanionData {
	a: string;
	b: string;
	relation: 'GOOD' | 'BAD';
	sourceRef: string;
}

// ── Step helpers ─────────────────────────────────────────────────────────
type Opts = Partial<Pick<StepData, 'isPlantingStart' | 'isPlantingEnd' | 'repeatEveryDays'>>;
type Win = Pick<StepData, 'anchor' | 'fixedMmdd' | 'offsetStartDays' | 'offsetEndDays'>;

/** Calendar window that moves with the last-frost date */
const lf = (from: string, to: string): Win => ({
	anchor: 'LAST_FROST',
	offsetStartDays: offsetFrom(DEFAULT_FROST.lastFrost, from),
	offsetEndDays: offsetFrom(DEFAULT_FROST.lastFrost, to)
});
/** Calendar window that moves with the first-frost date */
const ff = (from: string, to: string): Win => ({
	anchor: 'FIRST_FROST',
	offsetStartDays: offsetFrom(DEFAULT_FROST.firstFrost, from),
	offsetEndDays: offsetFrom(DEFAULT_FROST.firstFrost, to)
});
/** Fixed calendar window (perennials) */
const fixed = (from: string, to: string): Win => ({
	anchor: 'FIXED_MMDD',
	fixedMmdd: from,
	offsetStartDays: 0,
	offsetEndDays: offsetFrom(from, to) < 0 ? offsetFrom(from, to) + 365 : offsetFrom(from, to)
});
/** Days after the previous step's window */
const after = (startDays: number, endDays: number): Win => ({
	anchor: 'PREV_STEP',
	offsetStartDays: startDays,
	offsetEndDays: endDays
});
/** Days after the planting start */
const sincePlanting = (startDays: number, endDays: number): Win => ({
	anchor: 'PLANTING_START',
	offsetStartDays: startDays,
	offsetEndDays: endDays
});

const step = (
	type: StepType,
	location: StepLocation,
	win: Win,
	labelDe: string,
	sourceRef: string,
	opts: Opts = {}
): StepData => ({ type, location, ...win, labelDe, sourceRef, ...opts });

const START = { isPlantingStart: true } as const;
const END = { isPlantingEnd: true } as const;

// ── Families (spec §5.3) ─────────────────────────────────────────────────
export const FAMILIES: FamilyData[] = [
	{ slug: 'nachtschatten', nameDe: 'Nachtschattengewächse', nameLat: 'Solanaceae', rotationPauseYears: 3 },
	{ slug: 'kuerbis', nameDe: 'Kürbisgewächse', nameLat: 'Cucurbitaceae', rotationPauseYears: 4, sourceRef: 'Plantura' },
	{ slug: 'korbbluetler', nameDe: 'Korbblütler', nameLat: 'Asteraceae', rotationPauseYears: 3 },
	{ slug: 'kreuzbluetler', nameDe: 'Kreuzblütler', nameLat: 'Brassicaceae', rotationPauseYears: 4, sourceRef: 'selbst' },
	{ slug: 'lauch', nameDe: 'Lauchgewächse', nameLat: 'Amaryllidaceae', rotationPauseYears: 3 },
	{ slug: 'doldenbluetler', nameDe: 'Doldenblütler', nameLat: 'Apiaceae', rotationPauseYears: 3 },
	{ slug: 'rosen', nameDe: 'Rosengewächse', nameLat: 'Rosaceae', rotationPauseYears: 4 },
	{ slug: 'raublatt', nameDe: 'Raublattgewächse', nameLat: 'Boraginaceae', rotationPauseYears: 3 }
];

// ── Species (spec §5.1, §5.2, §5.5) ──────────────────────────────────────
export const SPECIES: SpeciesData[] = [
	{
		slug: 'tomate',
		nameDe: 'Tomate',
		nameLat: 'Solanum lycopersicum',
		family: 'nachtschatten',
		feedingType: 'HEAVY',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 60,
		inRowSpacingCm: 60,
		toxicityLevel: 'CAUTION',
		toxicityDe:
			'Blätter, Stängel und unreife grüne Früchte enthalten Solanin und Tomatin – nur reife Früchte essen. Der grüne Stielansatz ist laut BZfE unbedenklich. Für Hunde und Katzen sind die grünen Pflanzenteile giftig.',
		careDe:
			'Vorziehen bei 20–22 °C, nach dem Pikieren kühler und hell. Ab Mitte Mai ins Freiland, ins Gewächshaus ab Ende April. Wöchentlich ausgeizen und aufbinden.',
		storageDe:
			'Nicht in den Kühlschrank (Aromaverlust). Getrennt von anderem Obst und Gemüse lagern – Tomaten geben Ethylen ab. Grüne Früchte vor dem Frost ernten und warm nachreifen lassen.',
		outdoor: true,
		greenhouse: true,
		germTempMinC: 20,
		germTempMaxC: 22,
		heightMinCm: 150,
		heightMaxCm: 200,
		wikiTitle: 'Tomate',
		sourceRef: 'BZfE, Plantura, Oekotest, VZ, BMLUK, Keimzeit',
		routes: [
			{
				slug: 'freiland',
				nameDe: 'Vorkultur Fensterbank → Freiland',
				isDefault: true,
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('03-15', '04-15'), 'Tomaten auf der Fensterbank säen', 'BZfE'),
					step('PRICK_OUT', 'WINDOWSILL', after(14, 21), 'Tomaten pikieren', 'Praxis'),
					step('HARDEN_OFF', 'WINDOWSILL', lf('05-01', '05-14'), 'Tomaten abhärten (tagsüber raus)', 'Praxis'),
					step('PLANT_OUT', 'BED', lf('05-15', '06-05'), 'Tomaten auspflanzen', 'BZfE', START),
					step('CARE', 'BED', sincePlanting(14, 14), 'Tomaten ausgeizen und aufbinden', 'Praxis', { repeatEveryDays: 7 }),
					step('HARVEST', 'BED', ff('08-01', '10-31'), 'Tomaten ernten', 'BZfE', END)
				]
			},
			{
				slug: 'gewaechshaus',
				nameDe: 'Vorkultur Fensterbank → Gewächshaus',
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('03-01', '04-01'), 'Tomaten für das Gewächshaus säen', 'BZfE'),
					step('PRICK_OUT', 'WINDOWSILL', after(14, 21), 'Tomaten pikieren', 'Praxis'),
					step('PLANT_OUT', 'GREENHOUSE', lf('04-25', '05-15'), 'Tomaten ins Gewächshaus pflanzen', 'Plantura', START),
					step('CARE', 'GREENHOUSE', sincePlanting(14, 14), 'Tomaten ausgeizen und aufbinden', 'Praxis', { repeatEveryDays: 7 }),
					step('HARVEST', 'GREENHOUSE', ff('07-15', '10-31'), 'Tomaten ernten', 'Plantura', END)
				]
			}
		]
	},
	{
		slug: 'gurke',
		nameDe: 'Gurke',
		nameLat: 'Cucumis sativus',
		family: 'kuerbis',
		feedingType: 'HEAVY',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 150,
		inRowSpacingCm: 40,
		careDe:
			'Keimt bei 20–22 °C; Vorkultur nur 3–4 Wochen. Frostempfindlich – erst nach den Eisheiligen ins Freiland. Im Gewächshaus aufrecht ziehen, mindestens 30 cm Abstand in der Reihe.',
		storageDe:
			'Kälteempfindlich – nicht in den Kühlschrank, nur bei großer Hitze für 1–3 Tage. Ethylenempfindlich: nicht neben Tomaten oder Äpfeln lagern.',
		outdoor: true,
		greenhouse: true,
		germTempMinC: 20,
		germTempMaxC: 24,
		minSoilTempSowC: 14,
		heightMinCm: 100,
		heightMaxCm: 200,
		wikiTitle: 'Gurke',
		sourceRef: 'BZfE, Plantura, toom, Utopia, Oekotest, VZ, BMLUK, Gartenjournal',
		routes: [
			{
				slug: 'vorkultur',
				nameDe: 'Vorkultur Fensterbank → Freiland',
				isDefault: true,
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('04-01', '04-20'), 'Gurken auf der Fensterbank säen', 'Plantura'),
					step('PLANT_OUT', 'BED', lf('05-15', '05-31'), 'Gurken auspflanzen', 'BZfE, toom', START),
					step('HARVEST', 'BED', lf('06-15', '09-30'), 'Gurken ernten', 'BZfE', END)
				]
			},
			{
				slug: 'direktsaat',
				nameDe: 'Direktsaat Freiland',
				steps: [
					step('DIRECT_SOW', 'BED', lf('05-15', '06-10'), 'Gurken ins Beet säen', 'BZfE', START),
					step('HARVEST', 'BED', lf('07-01', '09-30'), 'Gurken ernten', 'BZfE, toom', END)
				]
			},
			{
				slug: 'gewaechshaus',
				nameDe: 'Vorkultur Fensterbank → Gewächshaus',
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('04-01', '04-15'), 'Gurken für das Gewächshaus säen', 'Plantura'),
					step('PLANT_OUT', 'GREENHOUSE', lf('05-01', '05-15'), 'Gurken ins Gewächshaus pflanzen', 'Utopia, toom', START),
					step('HARVEST', 'GREENHOUSE', lf('06-15', '09-30'), 'Gurken ernten', 'BZfE', END)
				]
			}
		]
	},
	{
		slug: 'salat',
		nameDe: 'Salat',
		nameLat: 'Lactuca sativa',
		family: 'korbbluetler',
		feedingType: 'LIGHT',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 30,
		inRowSpacingCm: 25,
		careDe: 'Kopf- und Pflücksalat. Für eine durchgehende Ernte alle 3 Wochen neu säen oder pflanzen.',
		storageDe:
			'Im Gemüsefach des Kühlschranks lagern und rasch verbrauchen. Nicht neben Tomaten lagern (ethylenempfindlich).',
		outdoor: true,
		heightMinCm: 20,
		heightMaxCm: 30,
		wikiTitle: 'Gartensalat',
		sourceRef: 'BZfE, Oekotest, Praxis',
		routes: [
			{
				slug: 'direktsaat',
				nameDe: 'Direktsaat',
				isDefault: true,
				steps: [
					step('DIRECT_SOW', 'BED', lf('03-25', '07-31'), 'Salat säen', 'BZfE', START),
					step('HARVEST', 'BED', after(45, 60), 'Salat ernten', 'BZfE', END)
				]
			},
			{
				slug: 'vorkultur',
				nameDe: 'Vorkultur → Pflanzung',
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('03-01', '07-15'), 'Salat vorziehen', 'BZfE'),
					step('PLANT_OUT', 'BED', lf('04-01', '08-15'), 'Salat pflanzen', 'BZfE', START),
					step('HARVEST', 'BED', after(45, 60), 'Salat ernten', 'BZfE', END)
				]
			}
		]
	},
	{
		slug: 'radieschen',
		nameDe: 'Radieschen',
		nameLat: 'Raphanus sativus var. sativus',
		family: 'kreuzbluetler',
		feedingType: 'LIGHT',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 10,
		inRowSpacingCm: 5,
		careDe: 'Aussaat im Februar nur unter Abdeckung. Alle 2–3 Wochen nachsäen.',
		storageDe: 'Grün abschneiden und im Kühlschrank lagern.',
		outdoor: true,
		heightMinCm: 10,
		heightMaxCm: 20,
		wikiTitle: 'Radieschen',
		sourceRef: 'BZfE, VZ, Praxis',
		routes: [
			{
				slug: 'direktsaat',
				nameDe: 'Direktsaat',
				isDefault: true,
				steps: [
					step('DIRECT_SOW', 'BED', lf('02-15', '08-15'), 'Radieschen säen', 'BZfE', START),
					step('HARVEST', 'BED', lf('04-25', '09-30'), 'Radieschen ernten', 'BZfE', END)
				]
			}
		]
	},
	{
		slug: 'zwiebel',
		nameDe: 'Zwiebel',
		nameLat: 'Allium cepa',
		family: 'lauch',
		feedingType: 'LIGHT',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 25,
		inRowSpacingCm: 10,
		toxicityLevel: 'CAUTION',
		toxicityDe:
			'Für Hunde und Katzen giftig: Schwefelverbindungen zerstören die roten Blutkörperchen (hämolytische Anämie). Für Menschen unbedenklich.',
		careDe: 'Steckzwiebeln 25 × 10 cm, Säzwiebeln 25 × 8 cm. Erntereif, wenn das Laub umfällt.',
		storageDe: 'Nach der Ernte einige Tage abtrocknen lassen, dann kühl, trocken und dunkel lagern.',
		defaultSourcing: 'SETS',
		outdoor: true,
		heightMinCm: 30,
		heightMaxCm: 60,
		wikiTitle: 'Zwiebel',
		sourceRef: 'BZfE, TFA, Praxis',
		routes: [
			{
				slug: 'steckzwiebel',
				nameDe: 'Steckzwiebeln',
				isDefault: true,
				steps: [
					step('PLANT_OUT', 'BED', lf('03-01', '04-30'), 'Steckzwiebeln setzen', 'BZfE', START),
					step('HARVEST', 'BED', lf('07-01', '08-31'), 'Zwiebeln ernten', 'BZfE', END)
				]
			},
			{
				slug: 'saat',
				nameDe: 'Direktsaat',
				steps: [
					step('DIRECT_SOW', 'BED', lf('03-01', '04-05'), 'Zwiebeln säen', 'BZfE', START),
					step('HARVEST', 'BED', lf('08-15', '09-30'), 'Zwiebeln ernten', 'BZfE', END)
				]
			}
		]
	},
	{
		slug: 'moehre',
		nameDe: 'Möhre',
		nameLat: 'Daucus carota subsp. sativus',
		family: 'doldenbluetler',
		feedingType: 'MEDIUM',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 25,
		inRowSpacingCm: 4,
		careDe: 'Frühe Sorten 25 × 4 cm, Lagermöhren 25 × 7 cm.',
		storageDe:
			'Grün abschneiden und kühl lagern. Nicht neben Tomaten oder Äpfeln lagern – sonst werden sie bitter.',
		outdoor: true,
		heightMinCm: 30,
		heightMaxCm: 50,
		wikiTitle: 'Möhre',
		sourceRef: 'BZfE, VZ, BMLUK, Praxis',
		routes: [
			{
				slug: 'frueh',
				nameDe: 'Frühe Möhren',
				isDefault: true,
				steps: [
					step('DIRECT_SOW', 'BED', lf('03-01', '07-15'), 'Möhren säen', 'BZfE', START),
					step('HARVEST', 'BED', after(90, 105), 'Möhren ernten', 'BZfE', END)
				]
			},
			{
				slug: 'lager',
				nameDe: 'Lagermöhren',
				steps: [
					step('DIRECT_SOW', 'BED', lf('05-01', '07-05'), 'Lagermöhren säen', 'BZfE', START),
					step('HARVEST', 'BED', after(120, 120), 'Lagermöhren ernten', 'BZfE', END)
				]
			}
		]
	},
	{
		slug: 'kartoffel',
		nameDe: 'Kartoffel',
		nameLat: 'Solanum tuberosum',
		family: 'nachtschatten',
		feedingType: 'HEAVY',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 60,
		inRowSpacingCm: 30,
		toxicityLevel: 'TOXIC',
		toxicityDe:
			'Grüne Stellen, Keime und „Augen“ enthalten Solanin und Chaconin. Grüne oder stark keimende Knollen nicht essen, grüne Stellen und Augen großzügig entfernen (BfR).',
		careDe:
			'Vorkeimen etwa 6 Wochen vor dem Pflanzen, hell bei 10–15 °C. Pflanzen, wenn der Boden mindestens 7 °C hat. Anhäufeln, sobald die Pflanzen 10–15 cm hoch sind.',
		storageDe: 'Kühl, dunkel und trocken lagern – nicht im Kühlschrank (kälteempfindlich).',
		defaultSourcing: 'SETS',
		outdoor: true,
		minSoilTempSowC: 7,
		heightMinCm: 50,
		heightMaxCm: 80,
		setWeightG: 70,
		wikiTitle: 'Kartoffel',
		sourceRef: 'BZfE, Oekotest, toom, BfR, VZ, LWG, Praxis',
		routes: [
			{
				slug: 'frueh',
				nameDe: 'Frühkartoffeln',
				isDefault: true,
				steps: [
					step('PRESPROUT', 'WINDOWSILL', lf('02-15', '03-15'), 'Frühkartoffeln vorkeimen', 'Oekotest'),
					step('PLANT_OUT', 'BED', lf('04-15', '05-31'), 'Kartoffeln legen', 'BZfE', START),
					step('CARE', 'BED', sincePlanting(21, 35), 'Kartoffeln anhäufeln', 'toom', { repeatEveryDays: 14 }),
					step('HARVEST', 'BED', lf('06-25', '07-31'), 'Frühkartoffeln ernten', 'BZfE', END)
				]
			},
			{
				slug: 'lager',
				nameDe: 'Lagerkartoffeln',
				steps: [
					step('PRESPROUT', 'WINDOWSILL', lf('03-01', '04-01'), 'Lagerkartoffeln vorkeimen', 'Oekotest'),
					step('PLANT_OUT', 'BED', lf('04-15', '05-31'), 'Kartoffeln legen', 'BZfE', START),
					step('CARE', 'BED', sincePlanting(21, 35), 'Kartoffeln anhäufeln', 'toom', { repeatEveryDays: 14 }),
					step('HARVEST', 'BED', lf('08-15', '09-30'), 'Lagerkartoffeln ernten', 'BZfE', END)
				]
			}
		]
	},
	{
		slug: 'erdbeere',
		nameDe: 'Erdbeere',
		nameLat: 'Fragaria × ananassa',
		family: 'rosen',
		feedingType: 'MEDIUM',
		lifecycle: 'PERENNIAL',
		lifespanYears: 4,
		rowSpacingCm: 90,
		inRowSpacingCm: 30,
		careDe: 'Bleibt 3–4 Jahre am Standort. Vor der Ernte Stroh unterlegen, nach der Ernte Ausläufer entfernen.',
		storageDe: 'Kaum lagerfähig: ungewaschen kühl lagern und schnell verbrauchen oder einfrieren.',
		defaultSourcing: 'SEEDLING',
		outdoor: true,
		heightMinCm: 15,
		heightMaxCm: 30,
		wikiTitle: 'Gartenerdbeere',
		sourceRef: 'BZfE, Praxis',
		routes: [
			{
				slug: 'pflanzung',
				nameDe: 'Pflanzung im Sommer',
				isDefault: true,
				steps: [
					step('PLANT_OUT', 'BED', fixed('07-01', '08-31'), 'Erdbeeren pflanzen', 'BZfE', START),
					step('CARE', 'BED', fixed('05-01', '05-31'), 'Stroh unter die Erdbeeren legen', 'Praxis'),
					step('HARVEST', 'BED', fixed('06-01', '07-31'), 'Erdbeeren ernten', 'BZfE'),
					step('CARE', 'BED', fixed('08-01', '08-31'), 'Erdbeeren: Ausläufer entfernen', 'Praxis')
				]
			}
		]
	},
	{
		slug: 'himbeere',
		nameDe: 'Herbsthimbeere',
		nameLat: 'Rubus idaeus',
		family: 'rosen',
		feedingType: 'MEDIUM',
		lifecycle: 'PERENNIAL',
		lifespanYears: 10,
		rowSpacingCm: 200,
		inRowSpacingCm: 40,
		careDe: 'Dauerkultur. Im Spätwinter alle Ruten bodennah abschneiden.',
		storageDe: 'Kaum lagerfähig: sofort verbrauchen oder einfrieren.',
		defaultSourcing: 'SEEDLING',
		outdoor: true,
		heightMinCm: 150,
		heightMaxCm: 200,
		wikiTitle: 'Himbeere',
		sourceRef: 'BZfE, Praxis, NaturaDB',
		routes: [
			{
				slug: 'herbst',
				nameDe: 'Pflanzung im Herbst',
				isDefault: true,
				steps: [
					step('PLANT_OUT', 'BED', fixed('10-01', '11-30'), 'Himbeeren pflanzen', 'BZfE', START),
					step('PRUNE', 'BED', fixed('02-01', '03-15'), 'Himbeerruten bodennah abschneiden', 'Praxis'),
					step('HARVEST', 'BED', fixed('08-01', '11-10'), 'Himbeeren ernten', 'BZfE')
				]
			},
			{
				slug: 'fruehjahr',
				nameDe: 'Pflanzung im Frühjahr',
				steps: [
					step('PLANT_OUT', 'BED', fixed('05-01', '06-30'), 'Himbeeren pflanzen', 'BZfE', START),
					step('HARVEST', 'BED', fixed('08-01', '11-10'), 'Himbeeren ernten', 'BZfE')
				]
			}
		]
	},
	{
		slug: 'paprika',
		nameDe: 'Paprika',
		nameLat: 'Capsicum annuum',
		family: 'nachtschatten',
		feedingType: 'HEAVY',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 40,
		inRowSpacingCm: 40,
		careDe: 'Keimt bei 25–28 °C, sehr hell stellen. Pikieren, sobald das zweite Blattpaar da ist.',
		storageDe: 'Kälteempfindlich – nicht in den Kühlschrank.',
		outdoor: true,
		greenhouse: true,
		germTempMinC: 25,
		germTempMaxC: 28,
		heightMinCm: 50,
		heightMaxCm: 100,
		wikiTitle: 'Paprika',
		sourceRef: 'BZfE, Utopia, VZ, Praxis',
		routes: [
			{
				slug: 'gewaechshaus',
				nameDe: 'Vorkultur Fensterbank → Gewächshaus',
				isDefault: true,
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('03-01', '03-15'), 'Paprika auf der Fensterbank säen', 'BZfE, Utopia'),
					step('PRICK_OUT', 'WINDOWSILL', after(21, 28), 'Paprika pikieren', 'Utopia'),
					step('PLANT_OUT', 'GREENHOUSE', lf('04-25', '05-15'), 'Paprika ins Gewächshaus pflanzen', 'Plantura', START),
					step('HARVEST', 'GREENHOUSE', lf('07-25', '09-30'), 'Paprika ernten', 'BZfE, Utopia', END)
				]
			},
			{
				slug: 'freiland',
				nameDe: 'Vorkultur Fensterbank → Freiland',
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('03-01', '03-15'), 'Paprika auf der Fensterbank säen', 'BZfE, Utopia'),
					step('PRICK_OUT', 'WINDOWSILL', after(21, 28), 'Paprika pikieren', 'Utopia'),
					step('HARDEN_OFF', 'WINDOWSILL', lf('05-01', '05-14'), 'Paprika abhärten', 'Praxis'),
					step('PLANT_OUT', 'BED', lf('05-15', '06-05'), 'Paprika auspflanzen', 'BZfE', START),
					step('HARVEST', 'BED', lf('07-25', '09-30'), 'Paprika ernten', 'BZfE', END)
				]
			}
		]
	},
	{
		slug: 'chili',
		nameDe: 'Chili',
		nameLat: 'Capsicum spp.',
		family: 'nachtschatten',
		feedingType: 'HEAVY',
		lifecycle: 'ANNUAL',
		rowSpacingCm: 40,
		inRowSpacingCm: 40,
		toxicityLevel: 'CAUTION',
		toxicityDe: 'Capsaicin reizt Haut, Augen und Schleimhäute – beim Schneiden Handschuhe tragen.',
		careDe: 'Sehr lange Entwicklungszeit (oft über 100 Tage bis zur Ernte): früh säen, bei 25–28 °C keimen lassen, viel Licht.',
		storageDe: 'Trocknen, einlegen oder einfrieren.',
		outdoor: true,
		greenhouse: true,
		germTempMinC: 25,
		germTempMaxC: 28,
		heightMinCm: 50,
		heightMaxCm: 100,
		wikiTitle: 'Chili',
		sourceRef: 'Plantura, Utopia, Praxis',
		routes: [
			{
				slug: 'gewaechshaus',
				nameDe: 'Vorkultur Fensterbank → Gewächshaus',
				isDefault: true,
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('01-15', '02-28'), 'Chili auf der Fensterbank säen', 'Plantura, Utopia'),
					step('PRICK_OUT', 'WINDOWSILL', after(21, 28), 'Chili pikieren', 'Utopia'),
					step('PLANT_OUT', 'GREENHOUSE', lf('04-15', '05-15'), 'Chili ins Gewächshaus pflanzen', 'Plantura', START),
					step('HARVEST', 'GREENHOUSE', ff('08-01', '10-31'), 'Chili ernten', 'Plantura', END)
				]
			},
			{
				slug: 'freiland',
				nameDe: 'Vorkultur Fensterbank → Freiland',
				steps: [
					step('PRESOW', 'WINDOWSILL', lf('01-15', '02-28'), 'Chili auf der Fensterbank säen', 'Plantura, Utopia'),
					step('PRICK_OUT', 'WINDOWSILL', after(21, 28), 'Chili pikieren', 'Utopia'),
					step('PLANT_OUT', 'BED', lf('05-15', '06-05'), 'Chili auspflanzen', 'Plantura', START),
					step('HARVEST', 'BED', ff('08-01', '10-15'), 'Chili ernten', 'Plantura', END)
				]
			}
		]
	},
	{
		slug: 'phacelia',
		nameDe: 'Phacelia',
		nameLat: 'Phacelia tanacetifolia',
		family: 'raublatt',
		feedingType: 'NONE',
		lifecycle: 'ANNUAL',
		careDe:
			'Gründüngung und Bienenweide, mit keiner Gemüsefamilie verwandt – passt in jede Fruchtfolge. Etwa 5 g/m². Friert im Winter ab, Reste liegen lassen.',
		isGreenManure: true,
		outdoor: true,
		heightMinCm: 60,
		heightMaxCm: 80,
		wikiTitle: 'Rainfarn-Phazelie',
		sourceRef: 'BayWa, Praxis',
		routes: [
			{
				slug: 'spaetsommer',
				nameDe: 'Gründüngung nach der Ernte',
				isDefault: true,
				steps: [
					step('DIRECT_SOW', 'BED', lf('08-01', '09-30'), 'Phacelia als Gründüngung säen', 'BayWa', START),
					step('CLEAR', 'BED', ff('11-01', '12-31'), 'Phacelia abfrieren lassen, Reste liegen lassen', 'Praxis', END)
				]
			},
			{
				slug: 'fruehjahr',
				nameDe: 'Frühjahrssaat',
				steps: [
					step('DIRECT_SOW', 'BED', lf('04-01', '05-31'), 'Phacelia säen', 'BayWa', START),
					step('CLEAR', 'BED', after(56, 70), 'Phacelia nach der Blüte umknicken', 'Praxis', END)
				]
			}
		]
	},
	{
		slug: 'gelbsenf',
		nameDe: 'Gelbsenf',
		nameLat: 'Sinapis alba',
		family: 'kreuzbluetler',
		feedingType: 'NONE',
		lifecycle: 'ANNUAL',
		careDe:
			'Schnelle Gründüngung (4–5 Wochen). Kreuzblütler: nicht säen, wenn in den letzten 3 Jahren Radieschen oder Kohl im Beet standen (Kohlhernie). Friert im Winter ab.',
		isGreenManure: true,
		outdoor: true,
		heightMinCm: 60,
		heightMaxCm: 120,
		wikiTitle: 'Weißer Senf',
		sourceRef: 'selbst, Praxis',
		routes: [
			{
				slug: 'herbst',
				nameDe: 'Gründüngung nach der Ernte',
				isDefault: true,
				steps: [
					step('DIRECT_SOW', 'BED', lf('08-01', '10-05'), 'Gelbsenf als Gründüngung säen', 'selbst', START),
					step('CLEAR', 'BED', ff('11-15', '12-31'), 'Gelbsenf abfrieren lassen, Reste liegen lassen', 'selbst', END)
				]
			}
		]
	}
];

// ── Neighbours (spec §5.4) ───────────────────────────────────────────────
const good = (a: string, b: string, sourceRef = 'BUND'): CompanionData => ({ a, b, relation: 'GOOD', sourceRef });
const bad = (a: string, b: string, sourceRef = 'BUND'): CompanionData => ({ a, b, relation: 'BAD', sourceRef });

export const COMPANIONS: CompanionData[] = [
	good('tomate', 'moehre'),
	good('tomate', 'salat'),
	good('tomate', 'radieschen'),
	good('tomate', 'paprika', 'Hornbach'),
	bad('tomate', 'kartoffel'),
	bad('tomate', 'gurke', 'Hornbach'),
	good('gurke', 'zwiebel'),
	good('gurke', 'salat'),
	good('gurke', 'paprika'),
	bad('gurke', 'radieschen'),
	good('salat', 'zwiebel'),
	good('salat', 'radieschen'),
	good('salat', 'erdbeere'),
	good('radieschen', 'moehre'),
	good('radieschen', 'erdbeere'),
	good('zwiebel', 'moehre'),
	good('zwiebel', 'erdbeere'),
	good('moehre', 'paprika'),
	bad('erdbeere', 'kartoffel'),
	bad('erdbeere', 'tomate'),
	bad('erdbeere', 'himbeere'),
	good('erdbeere', 'paprika'),
	good('zwiebel', 'paprika'),
	// Chili: not listed separately in BUND, takes the Paprika values (same genus)
	good('chili', 'tomate', 'Hornbach'),
	good('chili', 'moehre'),
	good('chili', 'zwiebel'),
	good('chili', 'gurke'),
	good('chili', 'erdbeere')
];
