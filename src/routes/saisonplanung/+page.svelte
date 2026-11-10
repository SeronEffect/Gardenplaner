<script lang="ts">
	import { page } from '$app/state';
	import { formatIsoDate, formatShort } from '#lib/i18n/de.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const year = $derived(data.season?.year);
	const total = $derived(data.beds.reduce((n, b) => n + b.slots.length, 0));
	const picked = $derived(new Set(data.picked));
	const allPicked = $derived(data.picked.length === data.options.length);
	// Keep season and wishlist in the URL when taking a suggestion over
	const takeAction = $derived(`?/uebernehmen&${page.url.searchParams.toString().replace(/(^|&)neu=\d+/, '')}`);
	const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
	const scoreClass = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : 'neutral');
</script>

<div class="layout">
	<aside class="card wish" aria-labelledby="wish-h">
		<h2 id="wish-h">Wunschliste</h2>
		<p class="muted">Welche Kulturen möchtest du {year} anbauen? Gilt nur für diese Ansicht.</p>
		<form method="GET">
			<input type="hidden" name="jahr" value={year} />
			<ul>
				{#each data.options as o (o.slug)}
					<li>
						<label><input type="checkbox" name="art" value={o.slug} checked={!allPicked && picked.has(o.slug)} /> {o.nameDe}</label>
					</li>
				{/each}
			</ul>
			<p class="muted small">Nichts angehakt = alle Kulturen.</p>
			<div class="actions">
				<button class="btn primary" type="submit">Vorschläge zeigen</button>
				{#if !allPicked}<a class="btn" href="/saisonplanung?jahr={year}">Alle</a>{/if}
			</div>
		</form>
	</aside>

	<div class="beds">
		{#if data.added}
			<p class="banner good" role="status">
				✓ {data.added.speciesDe} ist eingeplant.
				<a href="/gartenplan/beet/{data.added.bedId}/reihe/{data.added.id}?jahr={year}">Reihe bearbeiten</a>
			</p>
		{/if}
		{#if form?.errors?.length}
			<div class="banner bad" role="alert">
				<strong>Nicht übernommen:</strong>
				<ul>{#each form.errors as e, i (i)}<li>{e}</li>{/each}</ul>
			</div>
		{/if}

		<p class="muted intro">
			Für jeden freien Platz die passendsten Kulturen – bewertet nach Fruchtfolge, Nährstofffolge, Nachbarn und Höhe.
			Das Gewächshaus ist fest belegt und wird nicht vorgeschlagen. {total === 0 ? '' : `${total} freie Plätze.`}
		</p>

		{#each data.beds as b (b.bed.id)}
			<section class="card bed" aria-labelledby="bed-{b.bed.id}">
				<h2 id="bed-{b.bed.id}">
					<a href="/gartenplan/beet/{b.bed.id}?jahr={year}">{b.bed.name}</a>
					<span class="muted">{b.bed.lengthCm / 100} × {b.bed.widthCm / 100} m</span>
				</h2>
				{#if !b.slots.length}
					<p class="muted">Kein freier Platz für die gewählten Kulturen.</p>
				{/if}
				{#each b.slots as slot (slot.offsetCm)}
					<div class="slot">
						<h3>Freier Platz ab {slot.offsetCm} cm</h3>
						<ol>
							{#each slot.candidates as c, i (c.speciesId)}
								<li class="cand">
									<div class="top">
										<span class="rank">{i + 1}</span>
										<strong>{c.speciesDe}</strong>
										<span class="score {scoreClass(c.score)}" title="Punktwert">{signed(c.score)}</span>
										<span class="muted">{formatShort(c.startDate)}–{formatIsoDate(c.endDate)}</span>
									</div>
									{#if c.reasons.length}
										<ul class="reasons">
											{#each c.reasons as r, n (n)}<li class="lv-{r.level}">{r.messageDe}</li>{/each}
										</ul>
									{:else}
										<p class="muted small">Keine Fruchtfolge- oder Nachbarhinweise.</p>
									{/if}
									<form method="POST" action={takeAction} class="take">
										<input type="hidden" name="seasonId" value={data.season?.id} />
										<input type="hidden" name="bedId" value={b.bed.id} />
										<input type="hidden" name="speciesId" value={c.speciesId} />
										<input type="hidden" name="routeId" value={c.routeId} />
										<input type="hidden" name="offsetCm" value={c.offsetCm} />
										<label>
											Reihen
											<select name="rows">
												{#each Array.from({ length: c.maxRows }, (_, k) => k + 1) as n (n)}
													<option value={n}>{n} ({n * c.widthCm} cm)</option>
												{/each}
											</select>
										</label>
										<button class="btn primary" type="submit">Übernehmen</button>
									</form>
								</li>
							{/each}
						</ol>
						{#if slot.more}<p class="muted small">{slot.more} weitere {slot.more === 1 ? 'Kultur passt' : 'Kulturen passen'} hier.</p>{/if}
					</div>
				{/each}
			</section>
		{/each}
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 240px 1fr;
		gap: 20px;
		align-items: start;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 16px 18px;
	}
	.wish {
		position: sticky;
		top: 16px;
	}
	.wish h2,
	.bed h2 {
		font-size: 17px;
		margin-bottom: 6px;
	}
	.wish ul {
		list-style: none;
		padding: 0;
		margin: 10px 0;
		display: grid;
		gap: 2px;
	}
	.wish label {
		display: flex;
		gap: 8px;
		align-items: center;
		min-height: 32px;
	}
	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.small {
		font-size: 12px;
	}
	.intro {
		margin: 0 0 12px;
	}
	.beds {
		display: grid;
		gap: 16px;
		min-width: 0;
	}
	.bed h2 {
		display: flex;
		gap: 10px;
		align-items: baseline;
	}
	.slot {
		border-top: 1px solid var(--line-soft);
		padding-top: 10px;
		margin-top: 10px;
	}
	.slot h3 {
		font-size: 14px;
		margin-bottom: 8px;
	}
	ol {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		gap: 10px;
	}
	.cand {
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 10px 12px;
	}
	.top {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}
	.rank {
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: var(--green-dark);
		color: #fff;
		display: inline-grid;
		place-items: center;
		font-size: 12px;
	}
	.score {
		border-radius: 999px;
		padding: 1px 9px;
		font-size: 12px;
		font-weight: 600;
		border: 1px solid var(--line);
	}
	.score.good {
		background: var(--good-bg);
		border-color: var(--good-line);
		color: var(--good-ink);
	}
	.score.bad {
		background: var(--bad-bg);
		border-color: var(--bad-line);
		color: var(--bad-ink);
	}
	.reasons {
		margin: 8px 0 0;
		padding-left: 18px;
		font-size: 13px;
	}
	.lv-good {
		color: var(--good-ink);
	}
	.lv-warn,
	.lv-block {
		color: var(--bad-ink);
	}
	.lv-info {
		color: var(--muted);
	}
	.take {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
		margin-top: 10px;
	}
	.take label {
		display: flex;
		gap: 6px;
		align-items: center;
		font-size: 13px;
	}
	.take select {
		min-height: 40px;
		border-radius: 8px;
		border: 1px solid var(--line);
		padding: 4px 8px;
		background: #fff;
	}
	.banner {
		border-radius: 8px;
		padding: 10px 14px;
		margin: 0 0 4px;
	}
	.banner.good {
		background: var(--good-bg);
		border: 1px solid var(--good-line);
	}
	.banner.bad {
		background: var(--bad-bg);
		border: 1px solid var(--bad-line);
	}
	.banner ul {
		margin: 6px 0 0;
		padding-left: 18px;
	}
	@media (max-width: 800px) {
		.layout {
			grid-template-columns: 1fr;
		}
		.wish {
			position: static;
		}
		.wish ul {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
