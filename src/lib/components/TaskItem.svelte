<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { plantColor } from '../data/colors.ts';
	import { TASK_CATEGORY, formatShort } from '../i18n/de.ts';
	import { taskCategory, type TaskType } from '../rules/tasks.ts';

	interface Task {
		id: number;
		type: TaskType;
		titleDe: string;
		dueStart: string;
		dueEnd: string;
		status: 'OPEN' | 'DONE' | 'SKIPPED';
		speciesSlug: string | null;
		notesDe: string | null;
	}

	let { task, showDates = true }: { task: Task; showDates?: boolean } = $props();

	// Keep the current query (e.g. ?woche=) so the page stays on the same week after saving
	const action = $derived(`?/status${page.url.search ? '&' + page.url.search.slice(1) : ''}`);

	const cat = $derived(TASK_CATEGORY[taskCategory(task.type)]);
	const done = $derived(task.status !== 'OPEN');
</script>

<div class="task" class:done>
	<form method="POST" {action} use:enhance>
		<input type="hidden" name="taskId" value={task.id} />
		<input type="hidden" name="status" value={done ? 'OPEN' : 'DONE'} />
		<button class="check" type="submit" aria-pressed={task.status === 'DONE'} aria-label={done ? `${task.titleDe}: wieder öffnen` : `${task.titleDe}: erledigt`}>
			{#if task.status === 'DONE'}✓{:else if task.status === 'SKIPPED'}–{/if}
		</button>
	</form>
	<div class="text">
		<span class="title">
			{#if task.speciesSlug}<i class="dot" style:background={plantColor(task.speciesSlug).bg}></i>{/if}
			{task.titleDe}
		</span>
		<span class="meta">
			<span class="cat" style:color={cat.color}>{cat.label}</span>
			{#if showDates}· {formatShort(task.dueStart)}{task.dueEnd !== task.dueStart ? `–${formatShort(task.dueEnd)}` : ''}{/if}
			{#if task.status === 'SKIPPED'}· übersprungen{/if}
			{#if task.notesDe}· {task.notesDe}{/if}
		</span>
	</div>
	{#if !done}
		<form method="POST" {action} use:enhance>
			<input type="hidden" name="taskId" value={task.id} />
			<input type="hidden" name="status" value="SKIPPED" />
			<button class="skip" type="submit" aria-label="{task.titleDe}: überspringen" title="Überspringen">Überspringen</button>
		</form>
	{/if}
</div>

<style>
	.task {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 52px;
		padding: 6px 0;
	}
	form {
		margin: 0;
	}
	.check {
		width: 30px;
		height: 30px;
		border: 2px solid var(--green);
		border-radius: 8px;
		background: #fff;
		color: #fff;
		font-size: 18px;
		line-height: 1;
		cursor: pointer;
		flex: none;
		display: grid;
		place-items: center;
	}
	.done .check {
		background: var(--green);
	}
	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.title {
		font-size: 15px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.done .title {
		text-decoration: line-through;
		color: var(--muted);
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		flex: none;
	}
	.meta {
		font-size: 12px;
		color: var(--muted);
	}
	.cat {
		font-weight: 600;
	}
	.skip {
		font-size: 12px;
		color: var(--muted);
		background: none;
		border: 1px solid var(--line);
		border-radius: 999px;
		padding: 4px 10px;
		min-height: 32px;
		cursor: pointer;
	}
	.skip:hover {
		color: var(--ink);
		border-color: var(--muted);
	}
</style>
