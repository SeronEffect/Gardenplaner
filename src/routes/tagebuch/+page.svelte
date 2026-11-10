<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { formatIsoDate } from '#lib/i18n/de.ts';
	import { HARVEST_UNITS } from '#lib/rules/diary.ts';
	import type { SubmitFunction } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let type = $state<'HARVEST' | 'NOTE'>('HARVEST');
	// svelte-ignore state_referenced_locally
	let plantingId = $state(data.plantingId ? String(data.plantingId) : '');
	const act = (name: string) => `?/${name}&${page.url.searchParams.toString()}`;
	const fmt = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
	/** Keep type, date and row for the next entry; only clear amount and note after saving. */
	const keepChoices: SubmitFunction = ({ formElement }) => async ({ result, update }) => {
		await update({ reset: false });
		if (result.type !== 'success') return;
		for (const name of ['amount', 'text']) {
			const el = formElement.elements.namedItem(name) as HTMLInputElement | null;
			if (el) el.value = '';
		}
	};
</script>

<svelte:head>
	<title>Tagebuch {data.year} – Gardenplaner</title>
</svelte:head>

<div class="head">
	<h1>Tagebuch</h1>
	<form method="GET" class="filter">
		<label>Jahr
			<select name="jahr" value={String(data.year)} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				{#each data.years as y (y)}<option value={String(y)}>{y}</option>{/each}
			</select>
		</label>
		<label>Beet
			<select name="beet" value={data.bedId ? String(data.bedId) : ''} onchange={(e) => e.currentTarget.form?.requestSubmit()}>
				<option value="">alle</option>
				{#each data.beds as b (b.id)}<option value={String(b.id)}>{b.name}</option>{/each}
			</select>
		</label>
		<noscript><button class="btn" type="submit">Filtern</button></noscript>
	</form>
</div>

<div class="layout">
	<section class="card" aria-labelledby="new-h">
		<h2 id="new-h">Neuer Eintrag</h2>
		{#if form?.errors?.length}<ul class="err" role="alert">{#each form.errors as e, n (n)}<li>{e}</li>{/each}</ul>{/if}
		{#if form?.saved}<p class="ok" role="status">✓ Gespeichert.</p>{/if}
		<form method="POST" action={act('neu')} use:enhance={keepChoices} class="entry">
			<fieldset class="types">
				<legend class="visually-hidden">Art</legend>
				<label><input type="radio" name="type" value="HARVEST" bind:group={type} /> Ernte</label>
				<label><input type="radio" name="type" value="NOTE" bind:group={type} /> Notiz</label>
			</fieldset>
			<label>Datum <input type="date" name="date" value={data.today} required /></label>
			<label
				>Reihe {type === 'NOTE' ? '(optional)' : ''}
				<select name="plantingId" bind:value={plantingId}>
					<option value="">– keine bestimmte Reihe –</option>
					{#each data.plantings as p (p.id)}<option value={String(p.id)}>{p.labelDe}</option>{/each}
				</select>
			</label>
			{#if !plantingId}
				<div class="row2">
					<label>Beet
						<select name="bedId">
							<option value="">–</option>
							{#each data.beds as b (b.id)}<option value={String(b.id)}>{b.name}</option>{/each}
						</select>
					</label>
					<label>Kultur
						<select name="speciesId">
							<option value="">–</option>
							{#each data.species as s (s.id)}<option value={String(s.id)}>{s.nameDe}</option>{/each}
						</select>
					</label>
				</div>
			{/if}
			{#if type === 'HARVEST'}
				<div class="row2">
					<label>Menge <input name="amount" inputmode="decimal" required /></label>
					<label>Einheit
						<select name="unit">{#each HARVEST_UNITS as u (u)}<option value={u}>{u}</option>{/each}</select>
					</label>
				</div>
			{/if}
			<label>Notiz {type === 'HARVEST' ? '(optional)' : ''}<textarea name="text" rows="3" maxlength="1000"></textarea></label>
			<button class="btn primary" type="submit">Speichern</button>
		</form>
	</section>

	<div class="right">
		<section class="card" aria-labelledby="yield-h">
			<h2 id="yield-h">Ernte {data.year}{data.bedId ? ` · ${data.beds.find((b) => b.id === data.bedId)?.name ?? ''}` : ''}</h2>
			{#if data.yields.length}
				<table>
					<thead><tr><th scope="col">Kultur</th><th scope="col" class="num">Menge</th><th scope="col" class="num">Ernten</th></tr></thead>
					<tbody>
						{#each data.yields as y (y.speciesDe + y.unit)}
							<tr><td>{y.speciesDe}</td><td class="num">{fmt(y.amount)} {y.unit}</td><td class="num">{y.harvests}</td></tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="muted">Noch keine Ernte eingetragen.</p>
			{/if}
		</section>

		<section class="card" aria-labelledby="list-h">
			<h2 id="list-h">Einträge</h2>
			{#if !data.entries.length}<p class="muted">Keine Einträge für {data.year}.</p>{/if}
			<ul class="entries">
				{#each data.entries as e (e.id)}
					<li>
						<div class="meta">
							<span class="date">{formatIsoDate(e.date)}</span>
							<span class="chip {e.type === 'HARVEST' ? 'harvest' : ''}">{e.type === 'HARVEST' ? 'Ernte' : 'Notiz'}</span>
							{#if e.speciesDe}<strong>{e.speciesDe}</strong>{/if}
							{#if e.amount}<span>{fmt(e.amount)} {e.unit}</span>{/if}
							{#if e.bedName}<span class="muted">{e.bedName}</span>{/if}
							<form method="POST" action={act('loeschen')} use:enhance class="del">
								<input type="hidden" name="id" value={e.id} />
								<button class="link" type="submit" aria-label="Eintrag vom {formatIsoDate(e.date)} löschen">Löschen</button>
							</form>
						</div>
						{#if e.textDe}<p class="text">{e.textDe}</p>{/if}
					</li>
				{/each}
			</ul>
		</section>
	</div>
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		margin-bottom: 16px;
	}
	.head h1 {
		margin-right: auto;
	}
	.filter {
		display: flex;
		gap: 12px;
	}
	.filter label {
		display: flex;
		gap: 6px;
		align-items: center;
		font-size: 13px;
		color: var(--muted);
	}
	select,
	input,
	textarea {
		min-height: 40px;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 6px 10px;
		background: #fff;
		font: inherit;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(280px, 360px) 1fr;
		gap: 20px;
		align-items: start;
	}
	.right {
		display: grid;
		gap: 16px;
		min-width: 0;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 16px 18px;
	}
	h2 {
		font-size: 16px;
		margin-bottom: 10px;
	}
	.entry {
		display: grid;
		gap: 10px;
	}
	.entry label {
		display: grid;
		gap: 4px;
		font-size: 13px;
	}
	.types {
		border: 0;
		padding: 0;
		margin: 0;
		display: flex;
		gap: 16px;
	}
	.types label {
		display: flex;
		gap: 6px;
		align-items: center;
		font-size: 15px;
		min-height: 40px;
	}
	.row2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		padding: 6px 4px;
		border-bottom: 1px solid var(--line-soft);
	}
	th {
		font-size: 12px;
		color: var(--muted);
		font-weight: 600;
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.entries {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.entries li {
		border-top: 1px solid var(--line-soft);
		padding: 8px 0;
	}
	.entries li:first-child {
		border-top: 0;
	}
	.meta {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}
	.date {
		font-variant-numeric: tabular-nums;
		color: var(--muted);
		font-size: 13px;
	}
	.chip.harvest {
		background: #fdeeee;
		border-color: #e3a3a3;
	}
	.text {
		margin: 4px 0 0;
		white-space: pre-line;
	}
	.del {
		margin-left: auto;
	}
	.link {
		background: none;
		border: 0;
		color: #b4423a;
		cursor: pointer;
		min-height: 36px;
		text-decoration: underline;
	}
	.err {
		color: var(--bad-ink);
	}
	.ok {
		color: var(--good-ink);
		margin: 0 0 8px;
	}
	@media (max-width: 800px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
</style>
