<script lang="ts">
	import ManualTaskForm from '#lib/components/ManualTaskForm.svelte';
	import SeasonTimeline from '#lib/components/SeasonTimeline.svelte';
	import TaskItem from '#lib/components/TaskItem.svelte';
	import { BED_TYPE, SEASON_STATUS, formatIsoDate, formatMetres, formatWeekRange, taskPlace } from '#lib/i18n/de.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const openTasks = $derived(data.tasks.filter((t) => t.type !== 'HARVEST'));
	const harvest = $derived(data.tasks.filter((t) => t.type === 'HARVEST' && t.dueStart <= data.today));
	const groups = $derived(
		[...Map.groupBy(openTasks, (t) => taskPlace(t)).entries()].sort((a, b) =>
			a[0] === 'Fensterbank' ? -1 : b[0] === 'Fensterbank' ? 1 : a[0].localeCompare(b[0], 'de')
		)
	);
	const openCount = $derived(data.tasks.filter((t) => t.status === 'OPEN').length);
	const nextTitles = $derived([...new Set(data.nextWeek.map((t) => t.titleDe))]);
</script>

<svelte:head>
	<title>Übersicht – Gardenplaner</title>
</svelte:head>

<div class="head">
	<div>
		<p class="muted mono">{formatIsoDate(data.today)}{data.season ? ` · Saison ${data.season.year} (${SEASON_STATUS[data.season.status]})` : ''}</p>
		<h1>Übersicht <span class="mono">· KW {data.week.week}</span> <span class="range">{formatWeekRange(data.monday, data.sunday)}</span></h1>
	</div>
	<a class="btn" href="/kalender">Kalender</a>
</div>

{#if data.overdue.length}
	<a class="alert" href="#h-over">
		<i class="status-dot warn" aria-hidden="true"></i>
		<b>{data.overdue.length} {data.overdue.length === 1 ? 'Aufgabe' : 'Aufgaben'} überfällig</b>
		<span>{[...new Set(data.overdue.map((t) => t.titleDe))].slice(0, 3).join(' · ')}</span>
		<span class="go">Ansehen ↓</span>
	</a>
{/if}

<section class="beds" aria-label="Beete">
	{#each data.bedCards as b (b.id)}
		<a class="card bedcard" href="/gartenplan/beet/{b.id}">
			<div class="bh">
				<i class="status-dot {b.state}" aria-hidden="true"></i>
				<h2>{b.name}</h2>
				<span class="badge">{BED_TYPE[b.type] ?? b.type}</span>
			</div>
			<p class="crops">{b.crops.length ? b.crops.join(' · ') : 'frei'}</p>
			<dl>
				<dt>Größe</dt><dd class="mono">{formatMetres(b.sizeCm[0])} × {formatMetres(b.sizeCm[1])}</dd>
				<dt>Diese Woche</dt><dd class="mono">{b.open} offen{b.late ? ` · ${b.late} überfällig` : ''}</dd>
				<dt>Sensor</dt><dd class="mono idle">ab P7</dd>
			</dl>
		</a>
	{/each}
</section>

{#if data.season && data.timeline.length}
	<section class="card strip" aria-labelledby="h-strip">
		<div class="sh">
			<h2 id="h-strip">Saison {data.season.year} auf einen Blick</h2>
			<span class="muted mono">{data.plantingCount} Reihen · {data.bedsUsed} / {data.beds.length} Beete</span>
			<a href="/saison?jahr={data.season.year}">Zeitachse öffnen →</a>
		</div>
		<SeasonTimeline beds={data.timeline} year={data.season.year} lastFrost={data.frost.lastFrost} firstFrost={data.frost.firstFrost} today={data.today} compact />
	</section>
{/if}

<div class="cols">
	<section class="card main" aria-labelledby="h-week">
		<h2 id="h-week">Aufgaben KW {data.week.week} <span class="muted mono">· {openCount} offen</span></h2>
		{#each groups as [place, tasks] (place)}
			<h3>{place}</h3>
			<ul>
				{#each tasks as t (t.id)}<li><TaskItem task={t} /></li>{/each}
			</ul>
		{:else}
			<p class="muted">Diese Woche steht nichts an.{data.plantingCount === 0 ? ' Plane im Gartenplan Reihen – daraus entstehen die Aufgaben.' : ''}</p>
		{/each}
	</section>

	<div class="side">
		{#if data.overdue.length}
			<section class="card warn" aria-labelledby="h-over">
				<h2 id="h-over">Überfällig · {data.overdue.length}</h2>
				<ul>
					{#each data.overdue as t (t.id)}<li><TaskItem task={t} /></li>{/each}
				</ul>
			</section>
		{/if}

		<section class="card" aria-labelledby="h-harvest">
			<h2 id="h-harvest">Erntereif</h2>
			{#if harvest.length}
				<ul>
					{#each harvest as t (t.id)}<li><TaskItem task={t} /><span class="where">{taskPlace(t)}</span></li>{/each}
				</ul>
			{:else}
				<p class="muted">Gerade nichts zu ernten.</p>
			{/if}
		</section>

		<section class="card" aria-labelledby="h-next">
			<h2 id="h-next">Nächste Woche</h2>
			{#if nextTitles.length}
				<p class="muted">{nextTitles.slice(0, 8).join(' · ')}{nextTitles.length > 8 ? ' …' : ''}</p>
			{:else}
				<p class="muted">Noch nichts geplant.</p>
			{/if}
		</section>

		<details class="card" open={form?.form === 'neu'}>
			<summary>+ Eigene Aufgabe</summary>
			<ManualTaskForm beds={data.beds} defaultDate={data.today} errors={form?.form === 'neu' ? form.errors : []} />
		</details>
	</div>
</div>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 12px;
		margin-bottom: 16px;
		flex-wrap: wrap;
	}
	.head p {
		margin: 0 0 4px;
	}
	h1 {
		font-size: 20px;
	}
	h1 .mono {
		color: var(--muted);
		font-weight: 400;
	}
	.range {
		font-size: 14px;
		font-weight: 400;
		color: var(--muted);
	}
	.alert {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		margin-bottom: 14px;
		border-radius: 8px;
		background: var(--warn-bg);
		border: 1px solid var(--warn-line);
		color: var(--warn-ink);
		text-decoration: none;
		font-size: 14px;
	}
	.alert b {
		font-weight: 600;
	}
	.alert .go {
		margin-left: auto;
		font-weight: 600;
	}
	.beds {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 14px;
		margin-bottom: 14px;
	}
	.bedcard {
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		text-decoration: none;
		color: var(--ink);
	}
	.bedcard:hover {
		border-color: var(--field-line);
		color: var(--ink);
	}
	.bh {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.bh h2 {
		margin: 0;
		font-size: 15px;
		flex: 1;
	}
	.crops {
		font-size: 13px;
		color: var(--muted);
		min-height: 1.4em;
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 12px;
		font-size: 12px;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		text-align: right;
	}
	dd.idle {
		color: var(--idle);
	}
	.strip {
		padding: 14px 16px;
		margin-bottom: 14px;
	}
	.sh {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px 12px;
		margin-bottom: 8px;
	}
	.sh a {
		margin-left: auto;
		font-size: 13px;
		font-weight: 500;
	}
	.cols {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
		gap: 16px;
		align-items: start;
	}
	.side {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.cols .card {
		padding: 14px 16px;
	}
	.card.warn {
		background: var(--warn-bg);
		border-color: var(--warn-line);
	}
	h2 {
		font-size: 15px;
		margin-bottom: 6px;
	}
	h3 {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 14px 0 0;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		border-top: 1px solid var(--line-soft);
	}
	.where {
		font-size: 12px;
		color: var(--muted);
		display: block;
		margin: -6px 0 6px 42px;
	}
	p {
		margin: 4px 0;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
	}
	@media (max-width: 900px) {
		.cols {
			grid-template-columns: 1fr;
		}
		h1 {
			font-size: 18px;
		}
	}
</style>
