<script lang="ts">
	import { enhance } from '$app/forms';
	import { PLANTING_STATUS, SOURCING } from '../i18n/de.ts';
	import { checkRow, nextFreeOffset, plantingWindow, plantsPerRow, type RowLike } from '../rules/space.ts';
	import type { FrostDates } from '../rules/timeline.ts';

	interface SpeciesOpt {
		id: number;
		nameDe: string;
		rowSpacingCm: number | null;
		inRowSpacingCm: number | null;
		lifespanYears: number | null;
		defaultSourcing: string;
		routes: { id: number; nameDe: string; isDefault: boolean; steps: any[] }[];
	}
	interface Existing {
		id: number;
		speciesId: number;
		routeId: number | null;
		offsetCm: number;
		widthCm: number;
		quantityMode: 'FULL_ROW' | 'COUNT';
		count: number | null;
		startDate: string;
		endDate: string;
		sourcing: string;
		status: string;
		notesDe: string | null;
	}

	let {
		action,
		bed,
		seasonId,
		year,
		frost,
		species,
		others,
		planting = null,
		errors = [],
		submitLabel = 'Reihe speichern'
	}: {
		action: string;
		bed: { lengthCm: number; widthCm: number };
		seasonId: number;
		year: number;
		frost: FrostDates;
		species: SpeciesOpt[];
		/** Other rows of this bed (all seasons) */
		others: (RowLike & { id: number })[];
		planting?: Existing | null;
		errors?: string[];
		submitLabel?: string;
	} = $props();

	/** Proposed values for a plant + route: dates from the route, row width, first free position */
	function defaultsFor(sId: number, rId?: number) {
		const s = species.find((x) => x.id === sId);
		const r = s?.routes.find((x) => x.id === rId) ?? s?.routes.find((x) => x.isDefault) ?? s?.routes[0];
		let dates = { startDate: '', endDate: '' };
		if (s && r) {
			try {
				dates = plantingWindow(r.steps, frost, year, s.lifespanYears);
			} catch {
				/* route without steps – dates stay empty */
			}
		}
		const width = s?.rowSpacingCm ?? 25;
		const free = dates.startDate
			? nextFreeOffset(bed, width, dates.startDate, dates.endDate, others.filter((o) => o.id !== planting?.id))
			: null;
		return {
			speciesId: sId,
			routeId: r?.id ?? 0,
			widthCm: width,
			offsetCm: free ?? 0,
			sourcing: s?.defaultSourcing ?? 'SEED',
			...dates
		};
	}

	// Form state – from the existing row, or proposed for the first plant
	// svelte-ignore state_referenced_locally
	const init = planting
		? { ...planting, routeId: planting.routeId ?? 0 }
		: { ...defaultsFor(species[0]?.id ?? 0), quantityMode: 'FULL_ROW' as const, count: null, status: 'PLANNED', notesDe: '' };

	let speciesId = $state(init.speciesId);
	let routeId = $state(init.routeId);
	let quantityMode = $state<'FULL_ROW' | 'COUNT'>(init.quantityMode);
	let count = $state<number | null>(init.count);
	let offsetCm = $state(init.offsetCm);
	let widthCm = $state(init.widthCm);
	let startDate = $state(init.startDate);
	let endDate = $state(init.endDate);
	let sourcing = $state(init.sourcing);
	let status = $state(init.status);
	let notes = $state(init.notesDe ?? '');

	const sp = $derived(species.find((s) => s.id === speciesId));
	const maxPlants = $derived(plantsPerRow(bed.lengthCm, sp?.inRowSpacingCm));

	function apply(sId: number, rId?: number) {
		const d = defaultsFor(sId, rId);
		speciesId = d.speciesId;
		routeId = d.routeId;
		widthCm = d.widthCm;
		offsetCm = d.offsetCm;
		sourcing = d.sourcing;
		startDate = d.startDate;
		endDate = d.endDate;
	}
	const pickSpecies = (id: number) => apply(id);
	const pickRoute = (id: number) => apply(speciesId, id);

	const issues = $derived(
		startDate && endDate
			? checkRow(
					bed,
					{ id: planting?.id, offsetCm, widthCm, quantityMode, count, startDate, endDate },
					others,
					sp?.inRowSpacingCm
				)
			: []
	);
</script>

<form method="POST" {action} use:enhance class="form">
	{#if errors.length}
		<ul class="errors" role="alert">
			{#each errors as e, n (n)}<li>{e}</li>{/each}
		</ul>
	{/if}
	<input type="hidden" name="seasonId" value={seasonId} />

	<label
		>Pflanze
		<select name="speciesId" value={speciesId} onchange={(e) => pickSpecies(Number(e.currentTarget.value))}>
			{#each species as s (s.id)}<option value={s.id}>{s.nameDe}</option>{/each}
		</select>
	</label>
	{#if sp && sp.routes.length}
		<label
			>Anbauweg
			<select name="routeId" value={routeId} onchange={(e) => pickRoute(Number(e.currentTarget.value))}>
				{#each sp.routes as r (r.id)}<option value={r.id}>{r.nameDe}</option>{/each}
			</select>
		</label>
	{/if}

	<fieldset>
		<legend>Menge</legend>
		<label class="inline"
			><input type="radio" name="quantityMode" value="FULL_ROW" bind:group={quantityMode} /> volle Reihe{maxPlants
				? ` (${maxPlants} Pflanzen)`
				: ''}</label
		>
		<label class="inline"
			><input type="radio" name="quantityMode" value="COUNT" bind:group={quantityMode} /> Anzahl Pflanzen</label
		>
		{#if quantityMode === 'COUNT'}
			<input name="count" type="number" min="1" max={maxPlants ?? undefined} bind:value={count} aria-label="Anzahl Pflanzen" />
		{/if}
	</fieldset>

	<div class="two">
		<label>Position vom Rand (cm) <input name="offsetCm" type="number" min="0" max={bed.widthCm} bind:value={offsetCm} /></label>
		<label>Reihenbreite (cm) <input name="widthCm" type="number" min="1" max={bed.widthCm} bind:value={widthCm} /></label>
	</div>
	<div class="two">
		<label>Im Beet ab <input name="startDate" type="date" bind:value={startDate} /></label>
		<label>bis <input name="endDate" type="date" bind:value={endDate} /></label>
	</div>
	<p class="muted">Zeitraum aus dem Anbauweg vorgeschlagen – von Pflanzung/Aussaat bis Ernteende.</p>

	<div class="two">
		<label
			>Bezug
			<select name="sourcing" bind:value={sourcing}>
				{#each Object.entries(SOURCING) as [v, l] (v)}<option value={v}>{l}</option>{/each}
			</select>
		</label>
		<label
			>Status
			<select name="status" bind:value={status}>
				{#each Object.entries(PLANTING_STATUS) as [v, l] (v)}<option value={v}>{l}</option>{/each}
			</select>
		</label>
	</div>
	<label>Notiz <input name="notes" maxlength="1000" bind:value={notes} placeholder="z. B. Sorte 'Linda'" /></label>

	{#if issues.length}
		<ul class="warn" aria-live="polite">
			{#each issues as i, n (n)}<li>{i.messageDe}</li>{/each}
		</ul>
	{/if}
	<button class="btn primary" type="submit" disabled={issues.length > 0}>{submitLabel}</button>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		font-weight: 600;
	}
	label.inline {
		flex-direction: row;
		align-items: center;
		gap: 8px;
		font-weight: 400;
		font-size: 15px;
		min-height: 36px;
	}
	input:not([type='radio']),
	select {
		min-width: 0;
		width: 100%;
		font-weight: 400;
		font-size: 15px;
		padding: 8px 10px;
		border: 1px solid #c9ccc2;
		border-radius: 8px;
		background: #fff;
		min-height: 40px;
	}
	input[type='radio'] {
		width: 20px;
		height: 20px;
		accent-color: var(--green);
	}
	fieldset {
		border: 1px solid var(--line-soft);
		border-radius: 8px;
		padding: 6px 12px 10px;
		margin: 0;
		display: flex;
		flex-direction: column;
	}
	legend {
		font-size: 13px;
		font-weight: 600;
		padding: 0 4px;
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	p {
		margin: -4px 0 0;
	}
	.errors,
	.warn {
		border-radius: 8px;
		padding: 8px 12px 8px 28px;
		margin: 0;
		font-size: 14px;
		background: var(--bad-bg);
		border: 1px solid var(--bad-line);
	}
	button {
		align-self: flex-start;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
