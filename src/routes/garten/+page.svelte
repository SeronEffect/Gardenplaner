<script lang="ts">
	import { enhance } from '$app/forms';
	import TaskItem from '#lib/components/TaskItem.svelte';
	import { formatIsoDate, taskPlace } from '#lib/i18n/de.ts';
	import { HARVEST_UNITS } from '#lib/rules/diary.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	type Task = (typeof data.tasks)[number];
	const open = $derived(data.tasks.filter((t) => t.status === 'OPEN'));
	const today = $derived(open.filter((t) => t.dueStart <= data.today));
	const later = $derived(open.filter((t) => t.dueStart > data.today));
	const done = $derived(data.tasks.filter((t) => t.status !== 'OPEN'));
	const sections = $derived(
		[
			{ id: 'over', title: 'Überfällig', tasks: data.overdue as Task[] },
			{ id: 'today', title: 'Jetzt fällig', tasks: today },
			{ id: 'later', title: 'Später diese Woche', tasks: later }
		].filter((s) => s.tasks.length)
	);
	const savedHarvest = (id: number | null) => form?.form === 'ernte' && 'saved' in form && form.plantingId === id;
</script>

<svelte:head>
	<title>Gartenmodus – Gardenplaner</title>
</svelte:head>

<header class="head">
	<h1>Garten · KW {data.week}</h1>
	<p class="muted">{formatIsoDate(data.today)} · {open.length + data.overdue.length} offen</p>
</header>

{#each sections as s (s.id)}
	<section class="card" class:warn={s.id === 'over'} aria-labelledby="g-{s.id}">
		<h2 id="g-{s.id}">{s.title} · {s.tasks.length}</h2>
		<ul>
			{#each s.tasks as t (t.id)}
				<li>
					<TaskItem task={t} harvestLink={false} />
					<span class="where">{taskPlace(t)}</span>
					{#if t.type === 'HARVEST' && t.plantingId}
						<details class="quick" open={form?.form === 'ernte' && form.plantingId === t.plantingId}>
							<summary>Ernte eintragen</summary>
							<form method="POST" action="?/ernte" use:enhance class="harvest">
								<input type="hidden" name="plantingId" value={t.plantingId} />
								<label>Menge <input name="amount" inputmode="decimal" required size="5" /></label>
								<label>Einheit
									<select name="unit">{#each HARVEST_UNITS as u (u)}<option value={u}>{u}</option>{/each}</select>
								</label>
								<button class="btn primary" type="submit">Speichern</button>
							</form>
							{#if savedHarvest(t.plantingId)}<p class="ok" role="status">✓ Im Tagebuch gespeichert.</p>{/if}
							{#if form?.form === 'ernte' && form.plantingId === t.plantingId && 'errors' in form}
								<p class="err" role="alert">{form.errors?.join(' ')}</p>
							{/if}
						</details>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{:else}
	<section class="card"><p>Diese Woche ist nichts mehr offen. 🌱</p></section>
{/each}

<section class="card" aria-labelledby="g-note">
	<h2 id="g-note">Notiz</h2>
	<form method="POST" action="?/notiz" use:enhance class="note">
		<textarea name="text" rows="3" maxlength="1000" required placeholder="z. B. Schnecken an den Salaten"></textarea>
		<div class="row">
			<label>Beet
				<select name="bedId">
					<option value="">–</option>
					{#each data.beds as b (b.id)}<option value={String(b.id)}>{b.name}</option>{/each}
				</select>
			</label>
			<button class="btn primary" type="submit">Speichern</button>
		</div>
	</form>
	{#if form?.form === 'notiz' && 'saved' in form}<p class="ok" role="status">✓ Im Tagebuch gespeichert.</p>{/if}
	<p class="muted"><a href="/tagebuch">Zum Tagebuch</a></p>
</section>

{#if done.length}
	<details class="card done">
		<summary>Erledigt diese Woche · {done.length}</summary>
		<ul>
			{#each done as t (t.id)}<li><TaskItem task={t} /></li>{/each}
		</ul>
	</details>
{/if}

<style>
	.head {
		margin-bottom: 14px;
	}
	.head p {
		margin: 4px 0 0;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 14px 16px;
		margin-bottom: 14px;
		max-width: 720px;
	}
	.card.warn {
		border-color: var(--warn-line);
		background: #fffaf0;
	}
	h2 {
		font-size: 16px;
		margin-bottom: 6px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		border-top: 1px solid var(--line-soft);
		padding: 4px 0;
	}
	li:first-child {
		border-top: 0;
	}
	.where {
		display: block;
		font-size: 12px;
		color: var(--muted);
		margin: -4px 0 4px 46px;
	}
	.quick {
		margin: 0 0 6px 46px;
	}
	.quick summary {
		color: var(--green);
		cursor: pointer;
		min-height: 36px;
		display: flex;
		align-items: center;
	}
	.harvest,
	.note .row {
		display: flex;
		gap: 10px;
		align-items: end;
		flex-wrap: wrap;
	}
	label {
		display: grid;
		gap: 4px;
		font-size: 13px;
	}
	input,
	select,
	textarea {
		min-height: 44px;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 6px 10px;
		font: inherit;
		background: #fff;
	}
	.note {
		display: grid;
		gap: 10px;
	}
	textarea {
		width: 100%;
	}
	.ok {
		color: var(--good-ink);
		margin: 6px 0 0;
	}
	.err {
		color: var(--bad-ink);
		margin: 6px 0 0;
	}
	.done summary {
		cursor: pointer;
		font-weight: 600;
		min-height: 36px;
	}
</style>
