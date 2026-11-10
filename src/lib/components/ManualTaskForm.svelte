<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let {
		beds,
		defaultDate,
		errors = []
	}: { beds: { id: number; name: string }[]; defaultDate: string; errors?: string[] } = $props();
</script>

<form method="POST" action="?/neu{page.url.search ? '&' + page.url.search.slice(1) : ''}" use:enhance class="form">
	{#if errors.length}
		<ul class="errors" role="alert">{#each errors as e, n (n)}<li>{e}</li>{/each}</ul>
	{/if}
	<label>Aufgabe <input name="title" required maxlength="200" placeholder="z. B. Kompost umsetzen" /></label>
	<div class="two">
		<label>Fällig ab <input name="dueStart" type="date" required value={defaultDate} /></label>
		<label>bis (optional) <input name="dueEnd" type="date" /></label>
	</div>
	<label
		>Beet (optional)
		<select name="bedId">
			<option value="">– keins –</option>
			{#each beds as b (b.id)}<option value={b.id}>{b.name}</option>{/each}
		</select>
	</label>
	<label>Notiz <input name="notes" maxlength="500" /></label>
	<button class="btn primary" type="submit">Aufgabe anlegen</button>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 8px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		font-weight: 600;
	}
	input,
	select {
		font-weight: 400;
		font-size: 15px;
		padding: 8px 10px;
		border: 1px solid var(--field-line);
		border-radius: 8px;
		background: var(--field);
		min-height: 40px;
		min-width: 0;
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	.errors {
		background: var(--bad-bg);
		border: 1px solid var(--bad-line);
		border-radius: 8px;
		padding: 8px 12px 8px 28px;
		margin: 0;
		font-size: 14px;
	}
	button {
		align-self: flex-start;
	}
</style>
