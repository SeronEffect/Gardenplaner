<script lang="ts">
	import SeasonTimeline from '#lib/components/SeasonTimeline.svelte';
	import { SEASON_STATUS } from '#lib/i18n/de.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const laneCount = $derived(data.beds.reduce((n, b) => n + b.lanes.length, 0));
	const usedBeds = $derived(data.beds.filter((b) => b.lanes.length).length);
	const suggestions = $derived(data.beds.flatMap((b) => b.suggestions.map((s) => ({ ...s, bed: b.name }))));
	const short = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
</script>

<svelte:head>
	<title>Saison{data.season ? ` ${data.season.year}` : ''} – Gardenplaner</title>
</svelte:head>

<div class="head">
	<h1>Saison {data.season?.year ?? ''} <span class="muted mono">{data.season ? `· ${SEASON_STATUS[data.season.status]}` : ''}</span></h1>
	<nav class="years" aria-label="Saison wählen">
		{#each data.seasons as s (s.id)}
			<a href="?jahr={s.year}" class:on={s.id === data.season?.id} aria-current={s.id === data.season?.id ? 'page' : undefined}>{s.year}</a>
		{/each}
	</nav>
	{#if data.season}<a class="btn" href="/gartenplan?jahr={data.season.year}">Gartenplan</a>{/if}
</div>

{#if !data.season}
	<p class="muted">Noch keine Saison angelegt – im Gartenplan eine Saison hinzufügen.</p>
{:else}
	<div class="cols">
		<section class="card tl" aria-labelledby="h-tl">
			<h2 id="h-tl" class="visually-hidden">Zeitachse</h2>
			<SeasonTimeline beds={data.beds} year={data.season.year} lastFrost={data.frost.lastFrost} firstFrost={data.frost.firstFrost} today={data.today} />
		</section>

		<aside class="side">
			<section class="card panel" aria-labelledby="h-sum">
				<h2 id="h-sum">Überblick</h2>
				<dl>
					<dt>Reihen</dt><dd class="mono">{laneCount}</dd>
					<dt>Beete belegt</dt><dd class="mono">{usedBeds} / {data.beds.length}</dd>
				</dl>
				<p class="muted">Klick auf einen Balken öffnet die Reihe. Termine ändern sich im Reihenformular, nicht durch Ziehen.</p>
			</section>

			{#if data.season.status !== 'HISTORY'}
				<section class="card panel" aria-labelledby="h-gm">
					<h2 id="h-gm">Lücken für Gründüngung</h2>
					{#if suggestions.length}
						<ul>
							{#each suggestions as s (`${s.bed}:${s.plantingId}`)}
								<li><span class="warn" aria-hidden="true">!</span><span><b>{s.bed}</b>: nach {s.afterDe} frei ab {short(s.start)} – {s.label.replace('Gründüngung möglich: ', '')} passt</span></li>
							{/each}
						</ul>
					{:else}
						<p class="ok"><span aria-hidden="true">✓</span> Keine Lücken ≥ 6 Wochen.</p>
					{/if}
				</section>
			{/if}

			<section class="card panel" aria-labelledby="h-sens">
				<h2 id="h-sens">Sensoren</h2>
				<p class="muted">Ab P7 zeigt jedes Beet hier Bodentemperatur und -feuchte; Direktsaaten werden freigegeben, sobald der Boden warm genug ist.</p>
			</section>
		</aside>
	</div>
{/if}

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 16px;
		margin-bottom: 16px;
	}
	h1 {
		font-size: 22px;
	}
	h1 .muted {
		font-size: 14px;
		font-weight: 400;
	}
	.years {
		display: flex;
		gap: 4px;
		margin-left: auto;
	}
	.years a {
		font-family: var(--mono);
		font-size: 13px;
		text-decoration: none;
		color: var(--muted);
		padding: 6px 10px;
		border: 1px solid var(--line);
		border-radius: 6px;
		min-height: 36px;
		display: inline-flex;
		align-items: center;
	}
	.years a.on {
		color: var(--ink);
		background: var(--card-2);
		border-color: var(--field-line);
	}
	.cols {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		align-items: flex-start;
	}
	.tl {
		flex: 999 1 640px;
		min-width: 0;
		padding: 12px 14px;
	}
	.side {
		flex: 1 1 260px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.panel {
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 13px;
	}
	h2 {
		font-size: 14px;
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 6px;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	li {
		display: flex;
		gap: 8px;
	}
	.warn {
		color: var(--warn-ink);
		font-weight: 600;
	}
	.ok span {
		color: var(--green);
	}
	p {
		margin: 0;
	}
</style>
