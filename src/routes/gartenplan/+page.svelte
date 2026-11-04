<script lang="ts">
	import { BED_TYPE, formatMetres } from '#lib/i18n/de.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const year = $derived(data.season?.year);
	const rowsOf = (bedId: number) => data.plantings.filter((p) => p.bedId === bedId);
</script>

<h2>Beete {year ?? ''}</h2>
<ul class="beds">
	{#each data.beds as b (b.id)}
		{@const rows = rowsOf(b.id)}
		<li>
			<a href="/gartenplan/beet/{b.id}?jahr={year}">
				<strong>{b.name}</strong>
				<span class="muted">{BED_TYPE[b.type]} · {formatMetres(b.lengthCm)} × {formatMetres(b.widthCm)}</span>
				<span class="muted"
					>{rows.length
						? [...new Set(rows.map((r) => r.speciesDe))].join(', ')
						: 'noch nichts geplant'}</span
				>
			</a>
		</li>
	{/each}
</ul>

<style>
	h2 {
		font-size: 18px;
		margin-bottom: 8px;
	}
	.beds {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.beds a {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 4px;
		border-top: 1px solid var(--line-soft);
		color: inherit;
		text-decoration: none;
	}
	.beds a:hover strong {
		color: var(--green);
	}
</style>
