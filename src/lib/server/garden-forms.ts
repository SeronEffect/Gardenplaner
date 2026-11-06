// Reading the bed and row forms (shared by the "new" and "edit" pages).
import { FormReader } from './forms.ts';
import type { BedInput, PlantingInput } from './garden.ts';

export function readBedForm(fd: FormData): { values: BedInput | null; errors: string[] } {
	const f = new FormReader(fd);
	const values: BedInput = {
		name: f.str('name', 'Name', { required: true, max: 60 }) ?? '',
		type: f.oneOf('type', 'Typ', ['FLAT', 'RAISED', 'GREENHOUSE', 'POTS'] as const),
		lengthCm: f.metres('length', 'Länge', { required: true, min: 0.1, max: 100 }) ?? 0,
		widthCm: f.metres('width', 'Breite', { required: true, min: 0.1, max: 100 }) ?? 0,
		xCm: f.metres('x', 'Position x', { min: 0, max: 500 }) ?? 0,
		yCm: f.metres('y', 'Position y', { min: 0, max: 500 }) ?? 0,
		rowDirection: f.oneOf('rowDirection', 'Reihen-Richtung', ['HORIZONTAL', 'VERTICAL'] as const),
		rotationMode: f.oneOf('rotationMode', 'Fruchtfolge', ['STRICT', 'WARN', 'OFF'] as const),
		sun: f.oneOf('sun', 'Sonne', ['FULL', 'PARTIAL', 'SHADE'] as const),
		soilDe: f.str('soil', 'Boden', { max: 200 }),
		notesDe: f.str('notes', 'Notizen', { max: 1000 })
	};
	return { values: f.errors.length ? null : values, errors: f.errors };
}

export function readPlantingForm(
	fd: FormData,
	bedId: number
): { values: PlantingInput | null; errors: string[] } {
	const f = new FormReader(fd);
	const quantityMode = f.oneOf('quantityMode', 'Menge', ['FULL_ROW', 'COUNT'] as const);
	const values: PlantingInput = {
		bedId,
		seasonId: f.int('seasonId', 'Saison', { required: true, min: 1 }) ?? 0,
		speciesId: f.int('speciesId', 'Pflanze', { required: true, min: 1 }) ?? 0,
		routeId: f.int('routeId', 'Anbauweg', { min: 1 }),
		offsetCm: f.int('offsetCm', 'Position', { required: true, min: 0, max: 10000 }) ?? 0,
		widthCm: f.int('widthCm', 'Reihenbreite', { required: true, min: 1, max: 10000 }) ?? 0,
		quantityMode,
		count: quantityMode === 'COUNT' ? f.int('count', 'Anzahl', { required: true, min: 1, max: 10000 }) : null,
		startDate: f.date('startDate', 'Beginn'),
		endDate: f.date('endDate', 'Ende'),
		sourcing: f.oneOf('sourcing', 'Bezug', ['SEED', 'SEEDLING', 'SETS', 'EXISTING'] as const),
		status: f.oneOf('status', 'Status', ['PLANNED', 'ACTIVE', 'DONE'] as const),
		notesDe: f.str('notes', 'Notiz', { max: 1000 })
	};
	return { values: f.errors.length ? null : values, errors: f.errors };
}

/** Succession fields of the "new row" form (spec §4.6); null = a single row. */
export function readSuccessionForm(fd: FormData): { sets: number; intervalDays: number; errors: string[] } | null {
	const f = new FormReader(fd);
	if (!f.bool('succession')) return null;
	const sets = f.int('sets', 'Anzahl Sätze', { required: true, min: 2, max: 12 }) ?? 0;
	const intervalDays = f.int('intervalDays', 'Abstand der Sätze', { required: true, min: 7, max: 60 }) ?? 0;
	return { sets, intervalDays, errors: f.errors };
}

/** "nur diesen Satz" / "alle folgenden" */
export const readScope = (fd: FormData) => (fd.get('scope') === 'following' ? 'following' : 'one');
