<script lang="ts">
	import { page } from '$app/state';
	import { FEEDING } from '#lib/i18n/de.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let query = $state('');
	let family = $state('');
	let feeding = $state('');

	const families = $derived(
		[...new Map(data.plants.map((p) => [p.familySlug, p.familyDe])).entries()].sort((a, b) =>
			a[1].localeCompare(b[1], 'de')
		)
	);

	const filtered = $derived(
		data.plants.filter((p) => {
			const q = query.trim().toLowerCase();
			const text = `${p.nameDe} ${p.nameLat} ${p.familyDe}`.toLowerCase();
			return (!q || text.includes(q)) && (!family || p.familySlug === family) && (!feeding || p.feedingType === feeding);
		})
	);

	const selected = $derived(page.params.slug);
</script>

<div class="head">
	<h1>Pflanzen</h1>
	<div class="filters">
		<label class="visually-hidden" for="such">Suche</label>
		<input id="such" type="search" placeholder="Name, lateinisch, Familie …" bind:value={query} />
		<label class="visually-hidden" for="familie">Familie</label>
		<select id="familie" bind:value={family}>
			<option value="">Alle Familien</option>
			{#each families as [slug, name] (slug)}
				<option value={slug}>{name}</option>
			{/each}
		</select>
		<label class="visually-hidden" for="bedarf">Nährstoffbedarf</label>
		<select id="bedarf" bind:value={feeding}>
			<option value="">Nährstoffbedarf</option>
			{#each Object.entries(FEEDING) as [value, label] (value)}
				<option {value}>{label}</option>
			{/each}
		</select>
	</div>
</div>

<div class="split" class:has-selection={Boolean(selected)}>
	<ul class="grid" aria-label="Pflanzenliste">
		{#each filtered as p (p.slug)}
			<li>
				<a class="mini" class:on={p.slug === selected} href="/pflanzen/{p.slug}" data-sveltekit-noscroll>
					<div class="ph">
						{#if p.imageUrl}
							<img src={p.imageUrl} alt="" loading="lazy" />
						{:else}
							<span aria-hidden="true">{p.nameDe.slice(0, 1)}</span>
						{/if}
					</div>
					<div class="mi">
						<b>{p.nameDe}</b>
						<i>{p.nameLat}</i>
						<span class="tag">{FEEDING[p.feedingType]}</span>
					</div>
				</a>
			</li>
		{:else}
			<li class="muted">Keine Pflanze gefunden.</li>
		{/each}
	</ul>
	<section class="detail">
		{@render children()}
	</section>
</div>

<style>
	.head {
		display: flex;
		gap: 16px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 18px;
	}
	h1 {
		font-size: 28px;
		margin-right: auto;
	}
	.filters {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	input,
	select {
		padding: 9px 12px;
		border-radius: 8px;
		border: 1px solid #c9ccc2;
		background: #fff;
		min-height: 40px;
	}
	input {
		min-width: 220px;
	}
	.split {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 540px);
		gap: 20px;
		align-items: start;
	}
	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 12px;
	}
	.mini {
		display: block;
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		overflow: hidden;
		color: inherit;
		text-decoration: none;
		height: 100%;
	}
	.mini:hover {
		border-color: var(--green);
	}
	.mini.on {
		outline: 3px solid var(--green);
		outline-offset: -1px;
	}
	.ph {
		height: 90px;
		background: #e4e7dd;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--muted);
		font-size: 28px;
		font-family: var(--serif);
	}
	.ph img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.mi {
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.mi b {
		font-size: 15px;
	}
	.mi i {
		font-size: 12px;
		color: var(--muted);
	}
	.tag {
		font-size: 11px;
		color: var(--muted);
		margin-top: 4px;
	}
	.detail {
		position: sticky;
		top: 20px;
	}

	@media (max-width: 600px) {
		.filters {
			width: 100%;
		}
		input {
			flex: 1 1 100%;
			min-width: 0;
		}
		select {
			flex: 1 1 0;
			min-width: 0;
		}
	}
	@media (max-width: 1000px) {
		.split {
			grid-template-columns: 1fr;
		}
		/* On narrow screens show either the list or the selected card */
		.split.has-selection .grid {
			display: none;
		}
		.split:not(.has-selection) .detail {
			display: none;
		}
		.detail {
			position: static;
		}
	}
</style>
