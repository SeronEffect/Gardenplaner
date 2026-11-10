<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SEASON_STATUS } from '#lib/i18n/de.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const year = $derived(data.season?.year ?? null);
	const onShopping = $derived(page.url.pathname.startsWith('/saisonplanung/einkaufsliste'));

	function changeSeason(e: Event) {
		goto(`${page.url.pathname}?jahr=${(e.currentTarget as HTMLSelectElement).value}`);
	}
</script>

<svelte:head>
	<title>Saisonplanung{year ? ` ${year}` : ''} – Gardenplaner</title>
</svelte:head>

<div class="head">
	<h1>Saisonplanung</h1>
	{#if data.seasons.length}
		<label for="saison" class="muted">Saison</label>
		<select id="saison" value={String(year)} onchange={changeSeason}>
			{#each data.seasons as s (s.id)}
				<option value={String(s.year)}>{s.year} ({SEASON_STATUS[s.status]})</option>
			{/each}
		</select>
	{/if}
</div>

{#if !data.season}
	<section class="card">
		<p>Es gibt noch keine Saison in Planung. Lege die nächste Saison an, um sie zu planen.</p>
		<form method="POST" action="/gartenplan?/neueSaison">
			<button class="btn primary" type="submit">+ Saison {data.nextYear} anlegen</button>
		</form>
	</section>
{:else}
	<nav class="tabs" aria-label="Saisonplanung">
		<a href="/saisonplanung?jahr={year}" class:on={!onShopping} aria-current={!onShopping ? 'page' : undefined}>Vorschläge</a>
		<a href="/saisonplanung/einkaufsliste?jahr={year}" class:on={onShopping} aria-current={onShopping ? 'page' : undefined}
			>Einkaufsliste</a
		>
	</nav>
	{@render children()}
{/if}

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
	select {
		min-height: 40px;
		padding: 6px 10px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: #fff;
	}
	.tabs {
		display: flex;
		gap: 4px;
		border-bottom: 1px solid var(--line);
		margin-bottom: 18px;
	}
	.tabs a {
		padding: 10px 16px;
		text-decoration: none;
		color: var(--muted);
		border-bottom: 3px solid transparent;
		margin-bottom: -1px;
	}
	.tabs a.on {
		color: var(--green-dark);
		border-bottom-color: var(--green);
		font-weight: 600;
	}
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 18px;
	}
</style>
