<script lang="ts">
	import ManualTaskForm from '#lib/components/ManualTaskForm.svelte';
	import TaskItem from '#lib/components/TaskItem.svelte';
	import { TASK_CATEGORY, WEEKDAYS_SHORT, formatWeekRange, taskPlace } from '#lib/i18n/de.ts';
	import { taskCategory, type TaskCategory } from '#lib/rules/tasks.ts';
	import { addDaysIso } from '#lib/rules/weeks.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const days = $derived(Array.from({ length: 7 }, (_, i) => addDaysIso(data.monday, i)));

	// Filters (client-side)
	let hidden = $state(new Set<TaskCategory>());
	let showDone = $state(true);
	function toggle(c: TaskCategory) {
		const s = new Set(hidden);
		if (s.has(c)) s.delete(c);
		else s.add(c);
		hidden = s;
	}

	const visible = $derived(
		data.tasks.filter((t) => !hidden.has(taskCategory(t.type)) && (showDone || t.status === 'OPEN'))
	);
	// Group by place; Fensterbank first, then beds in order of appearance
	const groups = $derived(
		[...Map.groupBy(visible, (t) => taskPlace(t)).entries()].sort((a, b) =>
			a[0] === 'Fensterbank' ? -1 : b[0] === 'Fensterbank' ? 1 : a[0].localeCompare(b[0], 'de')
		)
	);
	const open = $derived(data.tasks.filter((t) => t.status === 'OPEN').length);

	/** Grid columns covered by a task within this week (1-based, for CSS grid) */
	function span(t: { dueStart: string; dueEnd: string }) {
		const from = Math.max(0, days.findIndex((d) => d >= t.dueStart));
		const lastIdx = days.findLastIndex((d) => d <= t.dueEnd);
		const to = lastIdx === -1 ? 6 : lastIdx;
		return { start: from + 1, end: to + 2, cutLeft: t.dueStart < data.monday, cutRight: t.dueEnd > data.sunday };
	}
</script>

<svelte:head>
	<title>Kalender KW {data.week.week} – Gardenplaner</title>
</svelte:head>

<div class="head">
	<h1>Kalender · KW {data.week.week}</h1>
	<span class="muted">{formatWeekRange(data.monday, data.sunday)} · {open} offen</span>
	<nav class="weeknav" aria-label="Woche wechseln">
		<a class="btn" href="?woche={data.prev}" aria-label="Vorige Woche">‹</a>
		<a class="btn" href="?woche={data.current}">Heute</a>
		<a class="btn" href="?woche={data.next}" aria-label="Nächste Woche">›</a>
	</nav>
</div>

<div class="filters" role="group" aria-label="Filter nach Art">
	{#each Object.entries(TASK_CATEGORY) as [key, c] (key)}
		<button
			type="button"
			class="chip"
			class:off={hidden.has(key as TaskCategory)}
			aria-pressed={!hidden.has(key as TaskCategory)}
			onclick={() => toggle(key as TaskCategory)}
			><i style:background={c.color}></i>{c.label}</button
		>
	{/each}
	<label class="chk"><input type="checkbox" bind:checked={showDone} /> Erledigte zeigen</label>
</div>

<section class="card">
	<div class="grid head-row" aria-hidden="true">
		<span></span>
		{#each days as d, i (d)}
			<span class="day" class:today={d === data.today}>{WEEKDAYS_SHORT[i]} {d.slice(8, 10)}.</span>
		{/each}
	</div>
	{#each groups as [place, tasks] (place)}
		<h2 class="place">{place}</h2>
		{#each tasks as t (t.id)}
			{@const s = span(t)}
			{@const color = TASK_CATEGORY[taskCategory(t.type)].color}
			<div class="grid row">
				<div class="cell-task"><TaskItem task={t} /></div>
				<div class="bars" style:grid-column="2 / 9" aria-hidden="true">
					{#each days as d (d)}<span class="slot" class:today={d === data.today}></span>{/each}
					<span
						class="bar"
						class:cut-left={s.cutLeft}
						class:cut-right={s.cutRight}
						class:faded={t.status !== 'OPEN'}
						style:grid-column="{s.start} / {s.end}"
						style:background={color}
					></span>
				</div>
			</div>
		{/each}
	{:else}
		<p class="muted empty">Keine Aufgaben in dieser Woche.</p>
	{/each}
</section>

<details class="card own" open={form?.form === 'neu'}>
	<summary>+ Eigene Aufgabe</summary>
	<ManualTaskForm beds={data.beds} defaultDate={data.today >= data.monday && data.today <= data.sunday ? data.today : data.monday} errors={form?.form === 'neu' ? form.errors : []} />
</details>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 12px;
	}
	h1 {
		font-size: 28px;
	}
	.weeknav {
		margin-left: auto;
		display: flex;
		gap: 6px;
	}
	.weeknav :global(.btn) {
		min-width: 44px;
		justify-content: center;
	}
	.filters {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-bottom: 12px;
		align-items: center;
	}
	.filters .chip {
		cursor: pointer;
		font-size: 13px;
		padding: 6px 12px;
		min-height: 36px;
	}
	.chip i {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		display: inline-block;
	}
	.chip.off {
		opacity: 0.45;
		text-decoration: line-through;
	}
	.chk {
		display: flex;
		gap: 6px;
		align-items: center;
		font-size: 13px;
		margin-left: 6px;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 10px 16px;
		margin-bottom: 14px;
	}
	.grid {
		display: grid;
		grid-template-columns: minmax(360px, 3fr) repeat(7, minmax(0, 1fr));
		align-items: center;
		column-gap: 0;
	}
	.head-row {
		border-bottom: 1px solid var(--line);
		padding-bottom: 6px;
	}
	.day {
		text-align: center;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
		padding: 4px 0;
		border-radius: 6px;
	}
	.day.today {
		background: var(--good-bg);
		color: var(--good-ink);
	}
	.place {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--muted);
		margin: 14px 0 2px;
	}
	.row {
		border-top: 1px solid var(--line-soft);
	}
	.cell-task {
		padding-right: 12px;
		min-width: 0;
	}
	.bars {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		height: 100%;
		position: relative;
		align-items: center;
	}
	.slot {
		grid-row: 1;
		height: 100%;
		min-height: 52px;
		border-left: 1px solid var(--line-soft);
	}
	.slot.today {
		background: var(--good-bg);
	}
	.bar {
		grid-row: 1;
		height: 18px;
		border-radius: 5px;
		margin: 0 3px;
		z-index: 1;
	}
	.bar.cut-left {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		margin-left: 0;
	}
	.bar.cut-right {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		margin-right: 0;
	}
	.bar.faded {
		opacity: 0.3;
	}
	.empty {
		padding: 16px 0;
	}
	.own summary {
		cursor: pointer;
		font-weight: 600;
		padding: 4px 0;
	}
	@media (max-width: 800px) {
		/* Phone: plain list, the week bars are hidden */
		.grid {
			grid-template-columns: 1fr;
		}
		.head-row,
		.bars {
			display: none;
		}
		.weeknav {
			margin-left: 0;
		}
	}
</style>
