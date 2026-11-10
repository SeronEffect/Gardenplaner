<script lang="ts">
	import { enhance } from '$app/forms';
	import { PLANTING_STATUS, SOURCING } from '../i18n/de.ts';
	import {
		checkRow,
		freeWidthAt,
		nextFreeOffset,
		plantingWindow,
		plantsInPlanting,
		rowsInWidth,
		type RowLike
	} from '../rules/space.ts';
	import type { FrostDates } from '../rules/timeline.ts';
	import { assessRow, companionMap, type Companion, type CropRow, type RotationMode } from '../rules/rotation.ts';
	import { planSuccession } from '../rules/succession.ts';
	import { formatIsoDate } from '../i18n/de.ts';

	interface SpeciesOpt {
		id: number;
		slug: string;
		nameDe: string;
		familyId: number;
		familyDe: string;
		rotationPauseYears: number;
		feedingType: 'HEAVY' | 'MEDIUM' | 'LIGHT' | 'NONE';
		isGreenManure: boolean;
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
		companions = [],
		historySeason = false,
		allowSuccession = false,
		following = 0,
		planting = null,
		errors = [],
		submitLabel = 'Reihe speichern'
	}: {
		action: string;
		bed: { lengthCm: number; widthCm: number; rotationMode: RotationMode };
		seasonId: number;
		year: number;
		frost: FrostDates;
		species: SpeciesOpt[];
		/** Other rows of this bed (all seasons) */
		others: (CropRow & { id: number })[];
		companions?: Companion[];
		/** History season: rotation conflicts only warn */
		historySeason?: boolean;
		/** New rows can be created as a succession series */
		allowSuccession?: boolean;
		/** Later sets of the same series (edit page) */
		following?: number;
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
	// A planting can cover several neighbouring rows (bug-fix-001)
	const rows = $derived(rowsInWidth(widthCm, sp?.rowSpacingCm));
	const maxPlants = $derived(plantsInPlanting(bed.lengthCm, widthCm, sp?.rowSpacingCm, sp?.inRowSpacingCm));
	const otherRows = $derived(others.filter((o) => o.id !== planting?.id));
	const free = $derived(startDate && endDate ? freeWidthAt(bed, offsetCm, startDate, endDate, otherRows) : 0);

	function setRows(n: number) {
		if (sp?.rowSpacingCm && n >= 1) widthCm = n * sp.rowSpacingCm;
	}
	function fillRest() {
		if (free > 0) widthCm = free;
	}

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

	// Succession growing (spec §4.6)
	let succession = $state(false);
	// svelte-ignore state_referenced_locally
	let sets = $state(3);
	// svelte-ignore state_referenced_locally
	let intervalDays = $state(init.speciesId && species.find((x) => x.id === init.speciesId)?.slug === 'radieschen' ? 14 : 21);
	let scope = $state<'one' | 'following'>('one');
	const plan = $derived(
		allowSuccession && succession && startDate && endDate && sets >= 2 && intervalDays >= 7
			? planSuccession(bed, { offsetCm, widthCm, quantityMode, count, startDate, endDate }, Math.min(sets, 12), intervalDays, otherRows)
			: []
	);

	// Rotation, feeding order and neighbours, live while editing (spec §4.2/4.3)
	const companionsBy = $derived(companionMap(companions));
	const assessment = $derived(
		sp && startDate && endDate
			? assessRow(
					{
						id: planting?.id,
						offsetCm,
						widthCm,
						quantityMode,
						count,
						startDate,
						endDate,
						speciesId: sp.id,
						speciesDe: sp.nameDe,
						familyId: sp.familyId,
						familyDe: sp.familyDe,
						rotationPauseYears: sp.rotationPauseYears,
						feedingType: sp.feedingType,
						isGreenManure: sp.isGreenManure
					},
					otherRows,
					bed.rotationMode,
					companionsBy
				).issues.map((i) => (historySeason && i.level === 'block' ? { ...i, level: 'warn' as const } : i))
			: []
	);
	const blocked = $derived(assessment.some((i) => i.level === 'block'));

	const issues = $derived(
		startDate && endDate
			? checkRow(
					bed,
					{ id: planting?.id, offsetCm, widthCm, quantityMode, count, startDate, endDate },
					others,
					{ inRowSpacingCm: sp?.inRowSpacingCm, rowSpacingCm: sp?.rowSpacingCm }
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
			><input type="radio" name="quantityMode" value="FULL_ROW" bind:group={quantityMode} /> volle Länge{maxPlants
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

	<div class="three">
		<label>Position vom Rand (cm) <input name="offsetCm" type="number" min="0" max={bed.widthCm} bind:value={offsetCm} /></label>
		<label
			>Reihen
			<input
				type="number"
				min="1"
				value={rows}
				disabled={!sp?.rowSpacingCm}
				oninput={(e) => setRows(Number(e.currentTarget.value))}
			/>
		</label>
		<label>Breite gesamt (cm) <input name="widthCm" type="number" min="1" max={bed.widthCm} bind:value={widthCm} /></label>
	</div>
	<div class="fill">
		<span class="muted"
			>{rows} {rows === 1 ? 'Reihe' : 'Reihen'}{sp?.rowSpacingCm ? ` à ${sp.rowSpacingCm} cm` : ''} · {free} cm frei ab
			{offsetCm} cm</span
		>
		<button class="btn" type="button" onclick={fillRest} disabled={free <= 0 || free === widthCm}>Restliche Breite füllen</button>
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

	{#if allowSuccession}
		<fieldset>
			<legend>Satzfolge</legend>
			<label class="inline"
				><input type="checkbox" name="succession" bind:checked={succession} /> Mehrere Sätze nacheinander (z. B. Salat alle 3 Wochen)</label
			>
			{#if succession}
				<div class="two">
					<label>Anzahl Sätze <input name="sets" type="number" min="2" max="12" bind:value={sets} /></label>
					<label>Abstand (Tage) <input name="intervalDays" type="number" min="7" max="60" bind:value={intervalDays} /></label>
				</div>
				{#if plan.length}
					<ol class="sets">
						{#each plan as s (s.index)}
							<li class:bad={s.offsetCm === null}>
								{formatIsoDate(s.startDate)} – {formatIsoDate(s.endDate)} ·
								{s.offsetCm === null ? 'kein Platz im Beet' : `${s.offsetCm}–${s.offsetCm + widthCm} cm`}
							</li>
						{/each}
					</ol>
					<p class="muted">Jeder Satz bleibt in der Reihe, wenn sie wieder frei ist, sonst rückt er in die nächste freie Reihe.</p>
				{/if}
			{/if}
		</fieldset>
	{/if}

	{#if following > 0}
		<fieldset>
			<legend>Satzfolge</legend>
			<label class="inline"><input type="radio" name="scope" value="one" bind:group={scope} /> nur diesen Satz</label>
			<label class="inline"
				><input type="radio" name="scope" value="following" bind:group={scope} /> diesen und alle folgenden ({following}) – um
				dieselben Tage verschieben</label
			>
		</fieldset>
	{/if}

	{#if issues.length}
		<ul class="warn" aria-live="polite">
			{#each issues as i, n (n)}<li>{i.messageDe}</li>{/each}
		</ul>
	{/if}
	{#if assessment.length}
		<ul class="checks" aria-live="polite" aria-label="Fruchtfolge und Nachbarn">
			{#each assessment as i, n (n)}<li class="lv-{i.level}">{i.messageDe}</li>{/each}
		</ul>
	{/if}
	{#if blocked}
		<p class="muted">Dieses Beet hat eine strenge Fruchtfolge. Anderen Platz wählen oder unter „Beet bearbeiten“ auf „nur Warnung“ stellen.</p>
	{/if}
	<button
		class="btn primary"
		type="submit"
		disabled={issues.length > 0 || blocked || plan.some((s) => s.offsetCm === null)}
		>{succession && plan.length ? `${plan.length} Sätze anlegen` : submitLabel}</button
	>
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
	input:not([type='radio']):not([type='checkbox']),
	select {
		min-width: 0;
		width: 100%;
		font-weight: 400;
		font-size: 15px;
		padding: 8px 10px;
		border: 1px solid var(--field-line);
		border-radius: 8px;
		background: var(--field);
		min-height: 40px;
	}
	input[type='radio'],
	input[type='checkbox'] {
		flex: none;
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
	.three {
		display: grid;
		grid-template-columns: 1fr 0.7fr 1fr;
		gap: 10px;
	}
	.fill {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-top: -4px;
	}
	.fill .btn {
		min-height: 36px;
		padding: 4px 12px;
		font-size: 13px;
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
	.checks {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 14px;
	}
	.checks li {
		border-radius: 8px;
		padding: 6px 10px;
		border: 1px solid var(--line-soft);
	}
	.checks .lv-block {
		background: var(--bad-bg);
		border-color: var(--bad-line);
	}
	.checks .lv-warn {
		background: var(--warn-bg);
		border-color: var(--warn-line);
	}
	.checks .lv-good {
		background: var(--good-bg);
		border-color: var(--good-line);
	}
	.sets {
		margin: 6px 0 0;
		padding-left: 22px;
		font-size: 14px;
	}
	.sets .bad {
		color: var(--bad-ink);
		font-weight: 600;
	}
	button {
		align-self: flex-start;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
