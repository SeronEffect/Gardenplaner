<script lang="ts">
	import { CATEGORY, MONTHS, MONTHS_SHORT } from '../i18n/de.ts';
	import { TIMELINE_CATEGORIES, type YearStrip } from '../rules/timeline.ts';

	let { strip }: { strip: YearStrip } = $props();

	const rows = $derived(TIMELINE_CATEGORIES.filter((c) => strip[c].some(Boolean)));

	function describe(cells: boolean[]): string {
		const months = MONTHS.filter((_, m) => cells[m * 2] || cells[m * 2 + 1]);
		return months.length ? months.join(', ') : 'keine';
	}
</script>

<div class="strip" role="table" aria-label="Jahresverlauf">
	<div class="row" role="row">
		<span role="columnheader" class="label"><span class="visually-hidden">Schritt</span></span>
		{#each MONTHS_SHORT as m, i (i)}
			<span role="columnheader" class="m" title={MONTHS[i]}>{m}</span>
		{/each}
	</div>
	{#each rows as cat (cat)}
		<div class="row" role="row">
			<span role="rowheader" class="label"><i class="dot" style="background: var(--c-{cat})"></i>{CATEGORY[cat]}</span>
			<span role="cell" class="cells" aria-label="{CATEGORY[cat]}: {describe(strip[cat])}">
				{#each strip[cat] as on, i (i)}
					<span class="c" class:on class:month-start={i % 2 === 0} style:--col="var(--c-{cat})"></span>
				{/each}
			</span>
		</div>
	{/each}
</div>

<style>
	.strip {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 12px;
	}
	.row {
		display: grid;
		grid-template-columns: 110px repeat(12, 1fr);
		align-items: center;
	}
	.row:not(:first-child) {
		grid-template-columns: 110px 1fr;
	}
	.m {
		text-align: center;
		color: var(--muted);
		font-weight: 600;
	}
	.label {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		flex: none;
	}
	.cells {
		display: grid;
		grid-template-columns: repeat(24, 1fr);
		height: 16px;
	}
	.c {
		background: var(--line-soft);
	}
	.c.month-start {
		border-left: 1px solid var(--card);
	}
	.c.on {
		background: var(--col);
	}
</style>
