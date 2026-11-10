// All UI text in one place (spec §0: German UI, English code).
import type { TimelineCategory } from '../rules/timeline.ts';

export const MONTHS_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const MONTHS = [
	'Januar',
	'Februar',
	'März',
	'April',
	'Mai',
	'Juni',
	'Juli',
	'August',
	'September',
	'Oktober',
	'November',
	'Dezember'
];

export const FEEDING: Record<string, string> = {
	HEAVY: 'Starkzehrer',
	MEDIUM: 'Mittelzehrer',
	LIGHT: 'Schwachzehrer',
	NONE: 'Gründüngung'
};

export const LIFECYCLE: Record<string, string> = {
	ANNUAL: 'einjährig',
	PERENNIAL: 'mehrjährig'
};

export const TOXICITY: Record<string, string> = {
	NONE: 'nicht giftig',
	CAUTION: 'Vorsicht',
	TOXIC: 'Giftig'
};

export const SOURCING: Record<string, string> = {
	SEED: 'Saatgut',
	SEEDLING: 'Jungpflanzen',
	SETS: 'Pflanzgut (Knollen, Steckzwiebeln)',
	EXISTING: 'vorhanden'
};

export const CATEGORY: Record<TimelineCategory, string> = {
	windowsill: 'Fensterbank',
	greenhouse: 'Gewächshaus',
	directSow: 'Direktsaat',
	plantOut: 'Auspflanzen',
	harvest: 'Ernte'
};

export const LOCATION: Record<string, string> = {
	WINDOWSILL: 'Fensterbank',
	GREENHOUSE: 'Gewächshaus',
	BED: 'Beet'
};

export const NAV = [
	{ href: '/', label: 'Übersicht', phase: 3 },
	{ href: '/saison', label: 'Saison', phase: 6 },
	{ href: '/gartenplan', label: 'Gartenplan', phase: 2 },
	{ href: '/saisonplanung', label: 'Saisonplanung', phase: 5 },
	{ href: '/kalender', label: 'Kalender', phase: 3 },
	{ href: '/pflanzen', label: 'Pflanzen', phase: 1 },
	{ href: '/tagebuch', label: 'Tagebuch', phase: 5 },
	{ href: '/garten', label: 'Gartenmodus', phase: 6 },
	{ href: '/sensoren', label: 'Sensoren', phase: 7 }
] as const;

/** 15.03. */
export function formatDayMonth(d: Date): string {
	return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.`;
}

export function formatRange(start: Date, end: Date): string {
	return start.getTime() === end.getTime()
		? formatDayMonth(start)
		: `${formatDayMonth(start)} – ${formatDayMonth(end)}`;
}

export const BED_TYPE: Record<string, string> = {
	FLAT: 'Flachbeet',
	RAISED: 'Hochbeet',
	GREENHOUSE: 'Gewächshaus',
	POTS: 'Töpfe / Kübel'
};

export const ROW_DIRECTION: Record<string, string> = {
	HORIZONTAL: 'waagerecht (links–rechts)',
	VERTICAL: 'senkrecht (oben–unten)'
};

export const ROTATION_MODE: Record<string, string> = {
	STRICT: 'streng (gleiche Familie gesperrt)',
	WARN: 'nur Warnung',
	OFF: 'keine Prüfung (Dauerkultur, Töpfe)'
};

export const SUN: Record<string, string> = {
	FULL: 'sonnig',
	PARTIAL: 'halbschattig',
	SHADE: 'schattig'
};

export const SEASON_STATUS: Record<string, string> = {
	HISTORY: 'Historie',
	PLANNING: 'in Planung',
	ACTIVE: 'aktiv',
	ARCHIVED: 'archiviert'
};

export const PLANTING_STATUS: Record<string, string> = {
	PLANNED: 'geplant',
	ACTIVE: 'wächst',
	DONE: 'abgeräumt'
};

/** "2026-05-15" → "15.05.2026" */
export function formatIsoDate(iso: string): string {
	return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}

/** 400 → "4,0 m" */
export function formatMetres(cm: number): string {
	return `${(cm / 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} m`;
}

export const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export const TASK_CATEGORY: Record<string, { label: string; color: string }> = {
	sow: { label: 'Säen', color: '#6fc28b' },
	plant: { label: 'Pflanzen', color: '#e8954f' },
	care: { label: 'Pflege', color: '#a9b89c' },
	fertilize: { label: 'Düngen', color: '#d9b65a' },
	harvest: { label: 'Ernte', color: '#e87c7c' },
	after: { label: 'Nachsorge', color: '#9aa6e6' },
	own: { label: 'Eigene', color: '#7fb2f0' }
};

/** Where a task happens: windowsill or the bed (the greenhouse is a bed) */
export function taskPlace(t: { location: string; bedName: string | null }): string {
	return t.location === 'WINDOWSILL' ? 'Fensterbank' : (t.bedName ?? 'Allgemein');
}

/** "10.05." */
export function formatShort(iso: string): string {
	return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
}

/** "10.–16.05.2027" / "28.04.–04.05.2027" */
export function formatWeekRange(monday: string, sunday: string): string {
	return monday.slice(5, 7) === sunday.slice(5, 7)
		? `${monday.slice(8, 10)}.–${formatIsoDate(sunday)}`
		: `${formatShort(monday)}–${formatIsoDate(sunday)}`;
}
