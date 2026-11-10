<script lang="ts">
	import YearStrip from '#lib/components/YearStrip.svelte';
	import { parseSourceRef } from '#lib/data/sources.ts';
	import { FEEDING, LIFECYCLE, LOCATION, SOURCING, formatRange } from '#lib/i18n/de.ts';
	import { resolveSteps, yearStrip } from '#lib/rules/timeline.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sp = $derived(data.detail.species);
	const family = $derived(data.detail.family);
	const routes = $derived(data.detail.routes);
	const year = new Date().getFullYear();

	const strip = $derived(yearStrip(routes.map((r) => r.steps), data.frost, year));
	const resolved = $derived(
		routes.map((r) => ({ route: r, steps: resolveSteps(r.steps, data.frost, year) }))
	);
	const good = $derived(data.detail.neighbours.filter((n) => n.relation === 'GOOD'));
	const bad = $derived(data.detail.neighbours.filter((n) => n.relation === 'BAD'));

	// All sources used on this card (species, steps, neighbours)
	const sources = $derived(
		[
			...new Map(
				[
					sp.sourceRef,
					family.sourceRef,
					...routes.flatMap((r) => r.steps.map((s) => s.sourceRef)),
					...data.detail.neighbours.map((n) => n.sourceRef)
				]
					.flatMap((ref) => parseSourceRef(ref))
					.map((s) => [s.name, s])
			).values()
		].sort((a, b) => Number(b.primary ?? false) - Number(a.primary ?? false))
	);

	const spacing = $derived(
		sp.rowSpacingCm && sp.inRowSpacingCm ? `${sp.rowSpacingCm} × ${sp.inRowSpacingCm} cm` : null
	);
	const height = $derived(
		sp.heightMaxCm ? `${sp.heightMinCm && sp.heightMinCm !== sp.heightMaxCm ? sp.heightMinCm + '–' : ''}${sp.heightMaxCm} cm` : null
	);
	const germ = $derived(
		sp.germTempMinC ? `${sp.germTempMinC}${sp.germTempMaxC ? '–' + sp.germTempMaxC : ''} °C` : null
	);
</script>

<svelte:head>
	<title>{sp.nameDe} – Gardenplaner</title>
</svelte:head>

<a class="back" href="/pflanzen" data-sveltekit-noscroll>← Alle Pflanzen</a>

<article class="card" aria-labelledby="plant-name">
	<figure class="pic">
		{#if sp.imageUrl}
			<img src={sp.imageUrl} alt={sp.nameDe} />
			<figcaption>
				Foto: {sp.imageCredit} ·
				{#if sp.imagePageUrl}<a href={sp.imagePageUrl} target="_blank" rel="noreferrer">{sp.imageLicense}</a
					>{:else}{sp.imageLicense}{/if}
			</figcaption>
		{:else}
			<div class="noimg">
				<span aria-hidden="true">{sp.nameDe.slice(0, 1)}</span>
				<small>Noch kein Bild – <code>pnpm images:fetch</code> lädt es von Wikimedia Commons.</small>
			</div>
		{/if}
	</figure>

	<div class="body">
		<h2 id="plant-name" class="name">{sp.nameDe}</h2>
		<p class="lat">{sp.nameLat}</p>
		<div class="chips">
			<span class="chip">{family.nameDe}</span>
			<span class="chip"
				>{LIFECYCLE[sp.lifecycle]}{sp.lifespanYears ? `, ${sp.lifespanYears} Jahre am Standort` : ''}</span
			>
			{#if sp.outdoor}<span class="chip">Freiland</span>{/if}
			{#if sp.greenhouse}<span class="chip">Gewächshaus</span>{/if}
			{#if sp.isGreenManure}<span class="chip">Gründüngung</span>{/if}
		</div>

		<dl class="facts">
			{#if height}<div><dt>Höhe</dt><dd>{height} <small class="muted">(Richtwert)</small></dd></div>{/if}
			{#if spacing}<div><dt>Abstand</dt><dd>{spacing}</dd></div>{/if}
			<div><dt>Nährstoffbedarf</dt><dd>{FEEDING[sp.feedingType]}</dd></div>
			{#if germ}<div><dt>Keimtemperatur</dt><dd>{germ}</dd></div>{/if}
			<div><dt>Bezug</dt><dd>{SOURCING[sp.defaultSourcing]}</dd></div>
			<div><dt>Fruchtfolge</dt><dd>{family.rotationPauseYears} Jahre Pause</dd></div>
		</dl>
		{#if spacing}<p class="muted note">Abstand: zwischen den Reihen × in der Reihe</p>{/if}

		{#if sp.toxicityLevel !== 'NONE'}
			<div class="tox" class:toxic={sp.toxicityLevel === 'TOXIC'} role="note">
				<strong>{sp.toxicityLevel === 'TOXIC' ? 'Giftig' : 'Vorsicht'}:</strong>
				{sp.toxicityDe}
			</div>
		{/if}

		<h3>Jahresverlauf</h3>
		<YearStrip {strip} />
		<p class="muted note">
			Bezogen auf den letzten Frost am {data.frost.lastFrost.split('-').reverse().join('.')}. und den ersten
			Frost am {data.frost.firstFrost.split('-').reverse().join('.')}.
		</p>

		{#if good.length || bad.length}
			<h3>Nachbarn</h3>
			<ul class="nb">
				{#each good as n (n.slug)}
					<li><a class="good" href="/pflanzen/{n.slug}" data-sveltekit-noscroll>✓ {n.nameDe}</a></li>
				{/each}
				{#each bad as n (n.slug)}
					<li><a class="bad" href="/pflanzen/{n.slug}" data-sveltekit-noscroll>✕ {n.nameDe}</a></li>
				{/each}
			</ul>
			<p class="muted note">✓ gute Nachbarn · ✕ schlechte Nachbarn</p>
		{/if}

		{#if sp.careDe}
			<h3>Pflege</h3>
			<p>{sp.careDe}</p>
		{/if}

		{#if sp.storageDe}
			<h3>Lagerung</h3>
			<p>{sp.storageDe}</p>
		{/if}

		<h3>Anbauwege &amp; Termine</h3>
		{#each resolved as { route, steps } (route.id)}
			<details open={route.isDefault}>
				<summary>{route.nameDe}{route.isDefault ? ' (Standard)' : ''}</summary>
				<ol class="steps">
					{#each steps as s (s.step.id)}
						<li>
							<span class="when">{formatRange(s.start, s.end)}</span>
							<span>{s.step.labelDe}{s.step.repeatEveryDays ? ` (alle ${s.step.repeatEveryDays} Tage)` : ''}</span>
							<span class="where">{LOCATION[s.step.location]}</span>
						</li>
					{/each}
				</ol>
			</details>
		{/each}

		<h3>Quellen</h3>
		<ul class="sources">
			{#each sources as s (s.name)}
				<li>
					{#if s.url}<a href={s.url} target="_blank" rel="noreferrer">{s.name}</a>{:else}{s.name}{/if}
				</li>
			{/each}
		</ul>
	</div>
</article>

<style>
	.back {
		display: none;
		margin-bottom: 12px;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: 14px;
		overflow: hidden;
	}
	.pic {
		margin: 0;
		background: #e4e7dd;
	}
	.pic img {
		display: block;
		width: 100%;
		height: 240px;
		object-fit: cover;
	}
	figcaption {
		font-size: 11px;
		color: var(--muted);
		padding: 6px 14px;
		background: #f4f5f0;
	}
	.noimg {
		height: 180px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--muted);
		text-align: center;
		padding: 0 20px;
	}
	.noimg span {
		font-family: var(--serif);
		font-size: 56px;
		line-height: 1;
	}
	.body {
		padding: 18px 22px 24px;
	}
	.name {
		font-family: var(--serif);
		font-size: 34px;
		font-weight: 600;
	}
	.lat {
		font-style: italic;
		color: var(--muted);
		margin: 2px 0 0;
	}
	.chips {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-top: 10px;
	}
	.facts {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 8px;
		margin: 16px 0 0;
	}
	.facts div {
		background: #f4f5f0;
		border-radius: 8px;
		padding: 8px 10px;
	}
	dt {
		font-size: 12px;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-weight: 600;
	}
	.note {
		margin: 6px 0 0;
		font-size: 12px;
	}
	.tox {
		margin-top: 14px;
		background: var(--warn-bg);
		border: 1px solid var(--warn-line);
		border-radius: 8px;
		padding: 10px 12px;
		font-size: 14px;
	}
	.tox.toxic {
		background: var(--bad-bg);
		border-color: var(--bad-line);
	}
	h3 {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 22px 0 8px;
	}
	p {
		margin: 0;
	}
	.nb {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.nb a {
		display: inline-block;
		padding: 5px 11px;
		border-radius: 999px;
		font-size: 13px;
		text-decoration: none;
		border: 1px solid;
	}
	.good {
		background: var(--good-bg);
		color: var(--good-ink);
		border-color: var(--good-line);
	}
	.bad {
		background: var(--bad-bg);
		color: var(--bad-ink);
		border-color: var(--bad-line);
	}
	details {
		border: 1px solid var(--line-soft);
		border-radius: 8px;
		padding: 8px 12px;
		margin-bottom: 8px;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	.steps {
		list-style: none;
		padding: 0;
		margin: 8px 0 0;
	}
	.steps li {
		display: grid;
		grid-template-columns: 120px 1fr auto;
		gap: 10px;
		padding: 6px 0;
		border-top: 1px solid var(--line-soft);
		font-size: 14px;
	}
	.when {
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	.where {
		font-size: 12px;
		color: var(--muted);
	}
	.sources {
		margin: 0;
		padding-left: 18px;
		font-size: 13px;
	}
	@media (max-width: 1000px) {
		.back {
			display: inline-block;
		}
	}
	@media (max-width: 500px) {
		.steps li {
			grid-template-columns: 1fr;
			gap: 2px;
		}
	}
</style>
