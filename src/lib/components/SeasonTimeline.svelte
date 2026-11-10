<script lang="ts">
	// Season timeline (docs/Redesign.md, D3). Read only: a click on a bar opens the row form.
	import { markAt, type Segment, type TimelineBed } from '#lib/rules/season-timeline.ts';
	import { MONTHS } from '#lib/i18n/de.ts';

	let {
		beds,
		year,
		lastFrost,
		firstFrost,
		today,
		compact = false
	}: {
		beds: TimelineBed[];
		year: number;
		/** MM-DD */
		lastFrost: string;
		firstFrost: string;
		today: string;
		/** One line per bed (overview) instead of one line per row */
		compact?: boolean;
	} = $props();

	const months = $derived(
		MONTHS.map((name, i) => ({ name: name.slice(0, 3), left: markAt(`${year}-${String(i + 1).padStart(2, '0')}-01`, year) ?? 0 }))
	);
	const marks = $derived(
		[
			{ label: 'letzter Frost', left: markAt(`${year}-${lastFrost}`, year), kind: 'frost' },
			{ label: 'erster Frost', left: markAt(`${year}-${firstFrost}`, year), kind: 'frost' },
			{ label: 'heute', left: markAt(today, year), kind: 'today' }
		].filter((m): m is { label: string; left: number; kind: string } => m.left !== null)
	);
	const KIND: Record<Segment['kind'], string> = {
		pre: 'Vorkultur',
		bed: 'im Beet',
		harvest: 'Ernte',
		manure: 'Gründüngung',
		suggestion: 'Gründüngung möglich'
	};
	const short = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
	const tip = (s: Segment) => `${s.label} · ${KIND[s.kind]} ${short(s.start)}–${short(s.end)}`;
	const href = (bedId: number, plantingId: number) => `/gartenplan/beet/${bedId}/reihe/${plantingId}?jahr=${year}`;
	const status = (b: TimelineBed) => (b.lanes.length ? 'ok' : '');
	// Order inside a line: long bars first, so harvest and pre-culture stay on top
	const layer = (s: Segment) => ({ bed: 1, manure: 1, suggestion: 2, pre: 3, harvest: 4 })[s.kind];
</script>

<div class="scroll">
	<div class="tl" class:compact role="table" aria-label="Saison {year}">
		<div class="row head" role="row">
			<div class="label" role="columnheader">{compact ? 'Beet' : 'Beet · Reihe'}</div>
			<div class="track" role="columnheader">
				{#each months as m (m.name)}<span class="month" style:left="{m.left}%">{m.name}</span>{/each}
				{#each marks as m (m.label)}<span class="mark-label {m.kind}" style:left="{m.left}%">{m.kind === 'today' ? 'heute' : '❄'}</span>{/each}
			</div>
		</div>

		{#each beds as bed (bed.id)}
			{#if compact}
				<div class="row" role="row">
					<div class="label" role="rowheader"><i class="status-dot {status(bed)}" aria-hidden="true"></i>{bed.name}</div>
					<div class="track" role="cell">
						{@render grid()}
						{#each bed.lanes.flatMap((l) => l.segments).toSorted((a, b) => layer(a) - layer(b)) as s, i (i)}
							<span class="bar {s.kind}" style:left="{s.left}%" style:width="{s.width}%" title={tip(s)}></span>
						{/each}
						{#each bed.suggestions as s (s.plantingId)}
							<span class="bar suggestion" style:left="{s.left}%" style:width="{s.width}%" title={tip(s)}></span>
						{/each}
						{#if !bed.lanes.length}<span class="empty">frei</span>{/if}
					</div>
				</div>
			{:else}
				<div class="row group" role="row">
					<div class="label" role="rowheader">
						<i class="status-dot {status(bed)}" aria-hidden="true"></i>
						<a href="/gartenplan/beet/{bed.id}?jahr={year}">{bed.name}</a>
					</div>
					<div class="track" role="cell">{@render grid()}</div>
				</div>
				{#each bed.lanes as lane (lane.key)}
					<div class="row" role="row">
						<div class="label sub" role="rowheader">
							<span>{lane.speciesDe}{lane.count > 1 ? ` ×${lane.count}` : ''}</span>
							<span class="cm">{lane.offsetCm}–{lane.offsetCm + lane.widthCm} cm</span>
						</div>
						<div class="track" role="cell">
							{@render grid()}
							{#each lane.segments.toSorted((a, b) => layer(a) - layer(b)) as s, i (i)}
								<a
									class="bar {s.kind}"
									style:left="{s.left}%"
									style:width="{s.width}%"
									href={href(bed.id, s.plantingId ?? lane.plantingId)}
									title={tip(s)}
									aria-label={tip(s)}
								></a>
							{/each}
							{#each bed.suggestions.filter((s) => lane.plantingIds.includes(s.plantingId ?? -1)) as s (s.plantingId)}
								<a class="bar suggestion" style:left="{s.left}%" style:width="{s.width}%" href="/gartenplan/beet/{bed.id}?jahr={year}" title={tip(s)} aria-label={tip(s)}></a>
							{/each}
						</div>
					</div>
				{:else}
					<div class="row" role="row">
						<div class="label sub" role="rowheader"><span class="cm">keine Reihen</span></div>
						<div class="track" role="cell">{@render grid()}</div>
					</div>
				{/each}
			{/if}
		{/each}
	</div>
</div>

<ul class="legend" aria-label="Legende">
	<li><i class="sw pre"></i>Vorkultur</li>
	<li><i class="sw bed"></i>im Beet</li>
	<li><i class="sw harvest"></i>Ernte</li>
	<li><i class="sw manure"></i>Gründüngung</li>
	<li><i class="sw suggestion"></i>Gründüngung möglich</li>
	<li><span class="frost">❄</span>Frost-Anker {lastFrost.slice(3)}.{lastFrost.slice(0, 2)}. / {firstFrost.slice(3)}.{firstFrost.slice(0, 2)}.</li>
</ul>

{#snippet grid()}
	{#each months as m (m.name)}<i class="gl" style:left="{m.left}%" aria-hidden="true"></i>{/each}
	{#each marks as m (m.label)}<i class="gl {m.kind}" style:left="{m.left}%" aria-hidden="true"></i>{/each}
{/snippet}

<style>
	.scroll {
		overflow-x: auto;
	}
	.tl {
		min-width: 760px;
		display: flex;
		flex-direction: column;
	}
	.row {
		display: flex;
		align-items: center;
		border-top: 1px solid var(--line-soft);
	}
	.row.head {
		border-top: 0;
		align-items: flex-end;
	}
	.row.group {
		border-top: 1px solid var(--line);
		margin-top: 6px;
	}
	.label {
		width: 190px;
		flex: none;
		display: flex;
		align-items: center;
		gap: 8px;
		padding-right: 10px;
		font-size: 13px;
		min-width: 0;
	}
	.compact .label {
		width: 130px;
	}
	.row.group .label {
		font-weight: 600;
		font-size: 14px;
		padding: 6px 0 2px;
	}
	.row.group .label a {
		color: var(--ink);
		text-decoration: none;
	}
	.row.group .label a:hover {
		color: var(--green);
	}
	.label.sub {
		color: var(--ink);
		justify-content: space-between;
	}
	.cm {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--muted);
		white-space: nowrap;
	}
	.head .label {
		color: var(--muted);
		font-size: 11px;
		font-family: var(--mono);
		padding-bottom: 4px;
	}
	.track {
		position: relative;
		flex: 1;
		height: 30px;
	}
	.compact .track {
		height: 26px;
	}
	.head .track {
		height: 34px;
	}
	.month,
	.mark-label {
		position: absolute;
		bottom: 4px;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--muted);
		padding-left: 4px;
	}
	.mark-label {
		bottom: auto;
		top: 0;
		transform: translateX(-50%);
		padding: 0;
		color: var(--info-ink);
	}
	.mark-label.today {
		color: var(--green);
	}
	.gl {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--line-soft);
	}
	.gl.frost {
		background: #2f4a6b;
	}
	.gl.today {
		background: var(--green);
		width: 2px;
		z-index: 5;
	}
	.bar {
		position: absolute;
		top: 50%;
		height: 14px;
		transform: translateY(-50%);
		border-radius: 3px;
		min-width: 3px;
		display: block;
	}
	.compact .bar {
		height: 10px;
	}
	.bar.pre {
		background: var(--t-pre);
		z-index: 2;
	}
	.bar.bed {
		background: var(--t-bed);
		z-index: 1;
	}
	.bar.harvest {
		background: var(--t-harvest);
		z-index: 3;
	}
	.bar.manure {
		background: #24384a;
		border: 1px solid var(--t-manure);
	}
	.bar.suggestion {
		border: 1px dashed var(--t-manure);
		background: transparent;
		z-index: 1;
	}
	a.bar:hover,
	a.bar:focus-visible {
		outline: 2px solid var(--green);
		outline-offset: 1px;
		z-index: 6;
	}
	.empty {
		position: absolute;
		left: 6px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 11px;
		font-family: var(--mono);
		color: var(--idle);
	}
	.legend {
		list-style: none;
		margin: 10px 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 6px 16px;
		font-size: 12px;
		color: var(--muted);
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.sw {
		width: 16px;
		height: 10px;
		border-radius: 2px;
		display: inline-block;
	}
	.sw.pre {
		background: var(--t-pre);
	}
	.sw.bed {
		background: var(--t-bed);
	}
	.sw.harvest {
		background: var(--t-harvest);
	}
	.sw.manure {
		background: #24384a;
		border: 1px solid var(--t-manure);
	}
	.sw.suggestion {
		border: 1px dashed var(--t-manure);
	}
	.frost {
		color: var(--info-ink);
	}
</style>
