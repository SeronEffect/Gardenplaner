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
	{ href: '/gartenplan', label: 'Gartenplan', phase: 2 },
	{ href: '/saisonplanung', label: 'Saisonplanung', phase: 5 },
	{ href: '/kalender', label: 'Kalender', phase: 3 },
	{ href: '/pflanzen', label: 'Pflanzen', phase: 1 },
	{ href: '/tagebuch', label: 'Tagebuch', phase: 2 }
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
