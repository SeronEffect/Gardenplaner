<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const year = $derived(data.season?.year);
	const act = (name: string) => `?/${name}&jahr=${year}`;

	const GROUPS = [
		{ kind: 'SEED', label: 'Saatgut' },
		{ kind: 'SETS', label: 'Pflanzgut (Knollen, Steckzwiebeln)' },
		{ kind: 'SEEDLING', label: 'Jungpflanzen' },
		{ kind: 'GREEN_MANURE', label: 'Gründüngung' },
		{ kind: null, label: 'Eigene Einträge' }
	] as const;
	const groups = $derived(
		GROUPS.map((g) => ({ ...g, items: data.items.filter((i) => i.kind === g.kind) })).filter((g) => g.items.length)
	);
	const open = $derived(data.items.filter((i) => !i.bought).length);
	const fmt = (n: number | null) => (n === null ? '' : n.toLocaleString('de-DE', { maximumFractionDigits: 1 }));
</script>

<div class="wrap">
	<p class="muted">
		Was du für {year} kaufen musst – berechnet aus allen geplanten Reihen der Saison (ohne Vorrat). Ändert sich der Plan,
		passt sich die Liste an; Haken und eigene Einträge bleiben. {data.items.length ? `${open} von ${data.items.length} offen.` : ''}
	</p>

	{#if !data.items.length}
		<section class="card"><p>Noch nichts zu kaufen – plane zuerst Reihen für {year} (Vorschläge oder Gartenplan).</p></section>
	{/if}

	{#each groups as g (g.label)}
		<section class="card" aria-labelledby="g-{g.kind ?? 'own'}">
			<h2 id="g-{g.kind ?? 'own'}">{g.label}</h2>
			<ul>
				{#each g.items as i (i.id)}
					<li class:done={i.bought}>
						<form method="POST" action={act('gekauft')} use:enhance>
							<input type="hidden" name="id" value={i.id} />
							<label>
								<input
									type="checkbox"
									name="bought"
									checked={i.bought}
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								/>
								<span class="name">{i.labelDe}</span>
							</label>
							<noscript><button class="btn" type="submit">Speichern</button></noscript>
						</form>
						<span class="qty">{fmt(i.quantity)} {i.unit ?? ''}</span>
						{#if i.detailDe}<span class="muted">{i.detailDe}</span>{/if}
						{#if i.stale}<span class="chip">nicht mehr im Plan</span>{/if}
						{#if i.generatedKey === null || i.stale}
							<form method="POST" action={act('loeschen')} use:enhance class="del">
								<input type="hidden" name="id" value={i.id} />
								<button class="link" type="submit" aria-label="{i.labelDe} entfernen">Entfernen</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<section class="card" aria-labelledby="own-h">
		<h2 id="own-h">Eigenen Eintrag hinzufügen</h2>
		{#if form?.errors?.length}<ul class="err" role="alert">{#each form.errors as e, n (n)}<li>{e}</li>{/each}</ul>{/if}
		<form method="POST" action={act('neu')} use:enhance class="add">
			<input type="hidden" name="seasonId" value={data.season?.id} />
			<label>Was <input name="label" required maxlength="120" placeholder="z. B. Tomatenstäbe" /></label>
			<label>Menge <input name="quantity" inputmode="decimal" size="6" /></label>
			<label>Einheit <input name="unit" maxlength="20" size="8" placeholder="Stück" /></label>
			<button class="btn primary" type="submit">Hinzufügen</button>
		</form>
	</section>
</div>

<style>
	.wrap {
		display: grid;
		gap: 14px;
		max-width: 860px;
	}
	.wrap > p {
		margin: 0;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 14px 18px;
	}
	h2 {
		font-size: 16px;
		margin-bottom: 8px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
		min-height: 44px;
		border-top: 1px solid var(--line-soft);
	}
	li:first-child {
		border-top: 0;
	}
	li label {
		display: flex;
		gap: 10px;
		align-items: center;
		min-height: 44px;
		cursor: pointer;
	}
	li input[type='checkbox'] {
		width: 20px;
		height: 20px;
	}
	.name {
		font-weight: 600;
		min-width: 120px;
	}
	.qty {
		font-variant-numeric: tabular-nums;
	}
	li.done .name,
	li.done .qty {
		text-decoration: line-through;
		color: var(--muted);
	}
	.del {
		margin-left: auto;
	}
	.link {
		background: none;
		border: 0;
		color: #b4423a;
		cursor: pointer;
		min-height: 40px;
		text-decoration: underline;
	}
	.add {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		align-items: end;
	}
	.add label {
		display: grid;
		gap: 4px;
		font-size: 13px;
	}
	.add input {
		min-height: 40px;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 6px 10px;
	}
	.err {
		color: var(--bad-ink);
		margin-bottom: 8px;
	}
</style>
