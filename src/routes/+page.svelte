<script lang="ts">
	import ManualTaskForm from '#lib/components/ManualTaskForm.svelte';
	import TaskItem from '#lib/components/TaskItem.svelte';
	import { SEASON_STATUS, formatIsoDate, formatWeekRange, taskPlace } from '#lib/i18n/de.ts';
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
		<p class="muted">{formatIsoDate(data.today)}{data.season ? ` · Saison ${data.season.year} (${SEASON_STATUS[data.season.status]})` : ''}</p>
		<h1>KW {data.week.week} · {formatWeekRange(data.monday, data.sunday)}</h1>
	</div>
	<a class="btn" href="/kalender">Kalender</a>
</div>

<div class="cols">
	<section class="card main" aria-labelledby="h-week">
		<h2 id="h-week">Diese Woche · {openCount} offen</h2>
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

		{#if data.season}
			<section class="card" aria-labelledby="h-season">
				<h2 id="h-season">Saison {data.season.year}</h2>
				<p>{data.plantingCount} Reihen in {data.bedsUsed} von {data.beds.length} Beeten</p>
				<a href="/gartenplan?jahr={data.season.year}">Zum Gartenplan</a>
			</section>
		{/if}

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
		font-size: 28px;
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
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 14px 16px;
	}
	.card.warn {
		background: var(--warn-bg);
		border-color: var(--warn-line);
	}
	h2 {
		font-size: 17px;
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
			font-size: 22px;
		}
	}
</style>
