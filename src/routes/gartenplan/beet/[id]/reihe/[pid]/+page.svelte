<script lang="ts">
	import PlantingForm from '#lib/components/PlantingForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const p = $derived(data.planting);
	const q = $derived(`jahr=${data.season?.year ?? p.seasonYear}`);
	const others = $derived(data.history.map((h) => ({ ...h, label: `${h.speciesDe} (${h.offsetCm}–${h.offsetCm + h.widthCm} cm)` })));
</script>

<svelte:head>
	<title>{p.speciesDe} bearbeiten – {data.bed.name}</title>
</svelte:head>

<a class="back" href="/gartenplan/beet/{data.bed.id}?{q}">← {data.bed.name}</a>
<h2>{p.speciesDe} bearbeiten</h2>
<p class="muted">Geplant in Saison {p.seasonYear}</p>

<PlantingForm
	action="?/speichern&{q}"
	bed={data.bed}
	seasonId={p.seasonId}
	year={p.seasonYear}
	frost={data.frost}
	species={data.species}
	{others}
	companions={data.companions}
	historySeason={p.seasonStatus === 'HISTORY'}
	following={data.following}
	planting={p}
	errors={form?.errors ?? []}
/>

<form method="POST" action="?/loeschen&{q}" class="delete">
	<button class="btn danger" type="submit">Reihe löschen</button>
	{#if data.following > 0}
		<button class="btn danger" type="submit" name="scope" value="following">Mit allen folgenden Sätzen löschen ({data.following})</button>
	{/if}
</form>

<style>
	.back {
		display: inline-block;
		margin-bottom: 8px;
		font-size: 14px;
	}
	h2 {
		font-size: 22px;
	}
	p {
		margin: 4px 0 12px;
	}
	.delete {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		margin-top: 16px;
		padding-top: 12px;
		border-top: 1px solid var(--line-soft);
	}
</style>
