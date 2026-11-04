<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import GardenMap from '#lib/components/GardenMap.svelte';
	import { SEASON_STATUS } from '#lib/i18n/de.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const year = $derived(data.season?.year ?? new Date().getFullYear());
	const q = $derived(`?jahr=${year}`);
	const selectedId = $derived(page.params.id ? Number(page.params.id) : null);

	// Date slider: day of the selected season
	const DAY = 86_400_000;
	const daysInYear = $derived(year % 4 === 0 ? 366 : 365);
	function defaultDay(y: number) {
		const now = new Date();
		const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
		const start = Date.UTC(y, 0, 1);
		// Today if it lies in this season's growing period (March–October), else mid-June
		const growing = now.getFullYear() === y && now.getMonth() >= 2 && now.getMonth() <= 9;
		return Math.round(((growing ? today : Date.UTC(y, 5, 15)) - start) / DAY);
	}
	let day = $state(0);
	$effect.pre(() => {
		day = defaultDay(year);
	});
	const dateIso = $derived(new Date(Date.UTC(year, 0, 1) + day * DAY).toISOString().slice(0, 10));
	const dateLabel = $derived(new Date(dateIso).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }));
	const visibleRows = $derived(data.plantings.filter((p) => p.startDate <= dateIso && dateIso <= p.endDate));

	function changeSeason(e: Event) {
		const y = (e.currentTarget as HTMLSelectElement).value;
		goto(`${page.url.pathname}?jahr=${y}`);
	}
</script>

<svelte:head>
	<title>Gartenplan {year} – Gardenplaner</title>
</svelte:head>

<div class="head">
	<h1>Gartenplan</h1>
	<label for="saison" class="muted">Saison</label>
	<select id="saison" value={String(year)} onchange={changeSeason}>
		{#each data.seasons as s (s.id)}
			<option value={String(s.year)}>{s.year} ({SEASON_STATUS[s.status]})</option>
		{/each}
	</select>
	<form method="POST" action="/gartenplan?/neueSaison">
		<button class="btn" type="submit">+ Saison {(data.seasons.at(-1)?.year ?? year) + 1}</button>
	</form>
	<a class="btn" href="/gartenplan/beet/neu{q}">+ Beet</a>
</div>

<div class="split">
	<section class="mapcard" aria-label="Lageplan">
		<div class="slider">
			<label for="stand">Stand: <strong>{dateLabel}</strong></label>
			<input id="stand" type="range" min="0" max={daysInYear - 1} bind:value={day} />
			<span class="muted">{visibleRows.length} Reihe(n) belegt</span>
		</div>
		{#if data.beds.length}
			<GardenMap beds={data.beds} rows={visibleRows} {selectedId} hrefFor={(id) => `/gartenplan/beet/${id}${q}`} />
		{:else}
			<p class="muted">Noch keine Beete – lege das erste Beet an.</p>
		{/if}
		<p class="muted hint">Beet anklicken zum Bearbeiten. Reihen zeigen, was am gewählten Tag im Beet steht.</p>
	</section>
	<section class="panel">
		{@render children()}
	</section>
</div>

<style>
	.head {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 16px;
	}
	h1 {
		font-size: 28px;
		margin-right: auto;
	}
	select {
		padding: 8px 10px;
		border-radius: 8px;
		border: 1px solid #c9ccc2;
		background: #fff;
		min-height: 40px;
	}
	form {
		margin: 0;
	}
	:global(.btn) {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 8px 14px;
		border-radius: 8px;
		border: 1px solid var(--green);
		background: #fff;
		color: var(--green);
		text-decoration: none;
		font-size: 14px;
		cursor: pointer;
	}
	:global(.btn.primary) {
		background: var(--green);
		color: #fff;
	}
	:global(.btn.danger) {
		border-color: #b4423a;
		color: #b4423a;
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 440px);
		gap: 16px;
		align-items: start;
	}
	.mapcard,
	.panel {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 14px 16px;
	}
	.slider {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 10px;
		font-size: 14px;
	}
	.slider input {
		flex: 1;
		min-width: 160px;
		accent-color: var(--green);
	}
	.hint {
		margin: 8px 0 0;
	}
	@media (max-width: 1000px) {
		.split {
			grid-template-columns: 1fr;
		}
	}
</style>
