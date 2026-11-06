<script lang="ts">
	import BedForm from '#lib/components/BedForm.svelte';
	import PlantingForm from '#lib/components/PlantingForm.svelte';
	import { plantColor } from '#lib/data/colors.ts';
	import { plantsInPlanting, rowsInWidth } from '#lib/rules/space.ts';
	import { BED_TYPE, FEEDING, PLANTING_STATUS, ROTATION_MODE, SUN, formatIsoDate, formatMetres } from '#lib/i18n/de.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const bed = $derived(data.bed);
	const season = $derived(data.season);
	const year = $derived(season?.year ?? new Date().getFullYear());
	const q = $derived(`jahr=${year}`);

	// Rows that take up space in the selected season
	const rows = $derived(
		data.history
			.filter((p) => p.startDate <= `${year}-12-31` && p.endDate >= `${year}-01-01`)
			.sort((a, b) => a.offsetCm - b.offsetCm || a.startDate.localeCompare(b.startDate))
	);
	// History grouped by the year the planting started
	const byYear = $derived(
		[...Map.groupBy(data.history, (p) => p.startDate.slice(0, 4)).entries()].sort((a, b) => b[0].localeCompare(a[0]))
	);
	const others = $derived(data.history.map((p) => ({ ...p, label: `${p.speciesDe} (${p.offsetCm}–${p.offsetCm + p.widthCm} cm)` })));

	let confirmDelete = $state(false);
</script>

<svelte:head>
	<title>{bed.name} – Gartenplan</title>
</svelte:head>

<a class="back" href="/gartenplan?{q}">← Alle Beete</a>
<h2>{bed.name}</h2>
<p class="muted">
	{BED_TYPE[bed.type]} · {formatMetres(bed.lengthCm)} × {formatMetres(bed.widthCm)} · {SUN[bed.sun]} · Fruchtfolge:
	{ROTATION_MODE[bed.rotationMode]}
</p>
{#if bed.notesDe}<p class="note">{bed.notesDe}</p>{/if}

<h3>Reihen {year}</h3>
{#if rows.length}
	<ul class="rows">
		{#each rows as r (r.id)}
			{@const c = plantColor(r.speciesSlug)}
			<li>
				<span class="sw" style:background={c.bg}></span>
				<div class="info">
					<strong>{r.speciesDe}</strong>
					<span class="muted"
						>{rowsInWidth(r.widthCm, r.rowSpacingCm) > 1 ? `${rowsInWidth(r.widthCm, r.rowSpacingCm)} Reihen · ` : ''}{r.quantityMode === 'COUNT'
							? `${r.count} Pflanzen`
							: `volle Länge${plantsInPlanting(bed.lengthCm, r.widthCm, r.rowSpacingCm, r.inRowSpacingCm) ? ` (${plantsInPlanting(bed.lengthCm, r.widthCm, r.rowSpacingCm, r.inRowSpacingCm)} Pflanzen)` : ''}`} · {r.offsetCm}–{r.offsetCm +
							r.widthCm} cm vom Rand{r.routeDe ? ` · ${r.routeDe}` : ''}</span
					>
					<span class="muted">{formatIsoDate(r.startDate)} – {formatIsoDate(r.endDate)} · {PLANTING_STATUS[r.status]}</span>
					{#if r.notesDe}<span class="muted">{r.notesDe}</span>{/if}
				</div>
				<div class="actions">
					<a class="btn" href="/gartenplan/beet/{bed.id}/reihe/{r.id}?{q}" aria-label="{r.speciesDe} bearbeiten">Bearbeiten</a>
					<form method="POST" action="?/reiheLoeschen&{q}">
						<input type="hidden" name="plantingId" value={r.id} />
						<button class="btn danger" type="submit" aria-label="{r.speciesDe} löschen">Löschen</button>
					</form>
				</div>
			</li>
		{/each}
	</ul>
{:else}
	<p class="muted">In {year} ist hier noch nichts geplant.</p>
{/if}

{#if season}
	<details open={form?.form === 'reihe' || rows.length === 0}>
		<summary>+ Reihe hinzufügen</summary>
		<!-- Re-created after each saved row, so the form starts fresh -->
		{#key data.history.length}
		<PlantingForm
			action="?/reihe&{q}"
			bed={bed}
			seasonId={season.id}
			{year}
			frost={data.frost}
			species={data.species}
			{others}
			errors={form?.form === 'reihe' ? form.errors : []}
			submitLabel="Reihe anlegen"
		/>
		{/key}
	</details>
{/if}

<h3>Historie</h3>
{#if byYear.length}
	<ol class="history">
		{#each byYear as [y, items] (y)}
			<li>
				<strong>{y}</strong>
				<ul>
					{#each items as p (p.id)}
						<li>
							<span class="sw small" style:background={plantColor(p.speciesSlug).bg}></span>
							{p.speciesDe}
							<span class="muted">· {p.familyDe} · {FEEDING[p.feedingType]} · {formatIsoDate(p.startDate)}–{formatIsoDate(p.endDate)}</span>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ol>
{:else}
	<p class="muted">Noch keine Einträge. Trage hier ein, was 2026 im Beet stand – das ist die Grundlage für die Fruchtfolge.</p>
{/if}

<details open={form?.form === 'beet'}>
	<summary>Beet bearbeiten</summary>
	<BedForm {bed} action="?/beet&{q}" errors={form?.form === 'beet' ? form.errors : []} />
	<form method="POST" action="?/beetLoeschen&{q}" class="delete">
		<label class="inline"
			><input type="checkbox" bind:checked={confirmDelete} /> Beet mit allen Reihen und der Historie löschen</label
		>
		<button class="btn danger" type="submit" disabled={!confirmDelete}>Beet löschen</button>
	</form>
</details>

<style>
	.back {
		display: inline-block;
		margin-bottom: 8px;
		font-size: 14px;
	}
	h2 {
		font-size: 22px;
	}
	h3 {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 20px 0 8px;
	}
	p {
		margin: 4px 0 0;
	}
	.note {
		background: var(--warn-bg);
		border: 1px solid var(--warn-line);
		border-radius: 8px;
		padding: 6px 10px;
		font-size: 13px;
		margin-top: 8px;
	}
	.rows,
	.history,
	.history ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rows li {
		display: flex;
		gap: 10px;
		padding: 10px 0;
		border-top: 1px solid var(--line-soft);
		align-items: flex-start;
	}
	.sw {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		flex: none;
		margin-top: 4px;
	}
	.sw.small {
		display: inline-block;
		width: 10px;
		height: 10px;
		margin: 0 4px 0 0;
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}
	.actions {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.actions form {
		margin: 0;
	}
	.actions .btn {
		min-height: 34px;
		padding: 4px 10px;
		font-size: 13px;
		width: 100%;
		justify-content: center;
	}
	details {
		border: 1px solid var(--line-soft);
		border-radius: 8px;
		padding: 10px 12px;
		margin-top: 14px;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
		margin-bottom: 4px;
	}
	.history > li {
		padding: 8px 0;
		border-top: 1px solid var(--line-soft);
	}
	.history ul li {
		padding: 2px 0;
		font-size: 14px;
	}
	.delete {
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--line-soft);
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: flex-start;
	}
	.inline {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 14px;
	}
	.inline input {
		width: 20px;
		height: 20px;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
