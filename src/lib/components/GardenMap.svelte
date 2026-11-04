<script lang="ts">
	import { plantColor } from '../data/colors.ts';
	import { formatIsoDate } from '../i18n/de.ts';

	interface Bed {
		id: number;
		name: string;
		type: string;
		xCm: number;
		yCm: number;
		lengthCm: number;
		widthCm: number;
		rowDirection: 'HORIZONTAL' | 'VERTICAL';
	}
	interface Row {
		id: number;
		bedId: number;
		offsetCm: number;
		widthCm: number;
		quantityMode: 'FULL_ROW' | 'COUNT';
		count: number | null;
		inRowSpacingCm: number | null;
		speciesSlug: string;
		speciesDe: string;
		startDate: string;
		endDate: string;
	}

	let {
		beds,
		rows,
		selectedId = null,
		hrefFor
	}: { beds: Bed[]; rows: Row[]; selectedId?: number | null; hrefFor: (bedId: number) => string } = $props();

	const PAD = 40;
	const size = (b: Bed) =>
		b.rowDirection === 'HORIZONTAL' ? { w: b.lengthCm, h: b.widthCm } : { w: b.widthCm, h: b.lengthCm };

	const bounds = $derived.by(() => {
		if (!beds.length) return { x: 0, y: 0, w: 1000, h: 600 };
		const xs = beds.flatMap((b) => [b.xCm, b.xCm + size(b).w]);
		const ys = beds.flatMap((b) => [b.yCm, b.yCm + size(b).h]);
		const x = Math.min(...xs) - PAD;
		const y = Math.min(...ys) - PAD;
		return { x, y, w: Math.max(...xs) - x + PAD, h: Math.max(...ys) - y + PAD * 2 };
	});
	const font = $derived(Math.max(bounds.w, bounds.h * 1.6) / 70);

	/** Rectangle of a row in map coordinates */
	function rowRect(b: Bed, r: Row) {
		const len =
			r.quantityMode === 'COUNT' && r.count && r.inRowSpacingCm
				? Math.min(r.count * r.inRowSpacingCm, b.lengthCm)
				: b.lengthCm;
		return b.rowDirection === 'HORIZONTAL'
			? { x: b.xCm, y: b.yCm + r.offsetCm, w: len, h: r.widthCm, vertical: false }
			: { x: b.xCm + r.offsetCm, y: b.yCm, w: r.widthCm, h: len, vertical: true };
	}

	const rowsByBed = $derived(
		new Map(beds.map((b) => [b.id, rows.filter((r) => r.bedId === b.id)]))
	);
</script>

<svg
	viewBox="{bounds.x} {bounds.y} {bounds.w} {bounds.h}"
	role="img"
	aria-label="Lageplan des Gartens mit {beds.length} Beeten"
>
	<defs>
		<pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
			<path d="M 100 0 L 0 0 0 100" fill="none" stroke="#dfe3d6" stroke-width="2" />
		</pattern>
	</defs>
	<rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="url(#grid)" />
	<text x={bounds.x + 10} y={bounds.y + font * 1.2} font-size={font * 0.8} fill="#5b6358">1 Kästchen = 1 m</text>

	{#each beds as b (b.id)}
		{@const s = size(b)}
		<a href={hrefFor(b.id)} aria-label="Beet {b.name} öffnen">
			<rect
				class="bed"
				class:gh={b.type === 'GREENHOUSE'}
				class:sel={b.id === selectedId}
				x={b.xCm}
				y={b.yCm}
				width={s.w}
				height={s.h}
				rx="6"
			/>
			{#each rowsByBed.get(b.id) ?? [] as r (r.id)}
				{@const rr = rowRect(b, r)}
				{@const c = plantColor(r.speciesSlug)}
				<rect x={rr.x} y={rr.y} width={rr.w} height={rr.h} fill={c.bg} stroke="#fff" stroke-width="3">
					<title>{r.speciesDe}: {formatIsoDate(r.startDate)} – {formatIsoDate(r.endDate)}</title>
				</rect>
				{#if (rr.vertical ? rr.w : rr.h) >= font * 1.3}
					{#if rr.vertical}
						<text
							x={rr.x + rr.w / 2}
							y={rr.y + rr.h / 2}
							font-size={font * 0.85}
							fill={c.fg}
							text-anchor="middle"
							dominant-baseline="central"
							transform="rotate(-90 {rr.x + rr.w / 2} {rr.y + rr.h / 2})">{r.speciesDe}</text
						>
					{:else}
						<text
							x={rr.x + font * 0.5}
							y={rr.y + rr.h / 2}
							font-size={font * 0.85}
							fill={c.fg}
							dominant-baseline="central">{r.speciesDe}</text
						>
					{/if}
				{/if}
			{/each}
			<text class="label" x={b.xCm} y={b.yCm + s.h + font * 1.15} font-size={font}>{b.name}</text>
		</a>
	{/each}
</svg>

<style>
	svg {
		width: 100%;
		height: auto;
		display: block;
		background: #eef0e8;
		border-radius: 8px;
		font-family: var(--font);
	}
	.bed {
		fill: #fff;
		stroke: #8a8f84;
		stroke-width: 4;
	}
	.bed.gh {
		fill: #f3eefa;
		stroke: #6b46c1;
	}
	.bed.sel {
		stroke: var(--green);
		stroke-width: 10;
	}
	a:hover .bed {
		stroke: var(--green);
	}
	a:focus-visible .bed {
		stroke: #7fb08a;
		stroke-width: 12;
	}
	.label {
		font-weight: 700;
		fill: var(--ink);
	}
</style>
