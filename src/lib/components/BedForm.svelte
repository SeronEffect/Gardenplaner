<script lang="ts">
	import { enhance } from '$app/forms';
	import { BED_TYPE, ROTATION_MODE, ROW_DIRECTION, SUN } from '../i18n/de.ts';

	interface BedValues {
		name: string;
		type: string;
		lengthCm: number;
		widthCm: number;
		xCm: number;
		yCm: number;
		rowDirection: string;
		rotationMode: string;
		sun: string;
		soilDe: string | null;
		notesDe: string | null;
	}

	let {
		bed = null,
		action,
		submitLabel = 'Speichern',
		errors = []
	}: { bed?: BedValues | null; action: string; submitLabel?: string; errors?: string[] } = $props();

	const m = (cm: number | undefined) => (cm === undefined ? '' : String(cm / 100).replace('.', ','));
</script>

<form method="POST" {action} use:enhance class="form">
	{#if errors.length}
		<ul class="errors" role="alert">
			{#each errors as e, n (n)}<li>{e}</li>{/each}
		</ul>
	{/if}
	<label>Name <input name="name" required maxlength="60" value={bed?.name ?? ''} /></label>
	<label
		>Typ
		<select name="type" value={bed?.type ?? 'FLAT'}>
			{#each Object.entries(BED_TYPE) as [v, l] (v)}<option value={v}>{l}</option>{/each}
		</select>
	</label>
	<div class="two">
		<label>Länge (m) <input name="length" inputmode="decimal" required value={m(bed?.lengthCm)} /></label>
		<label>Breite (m) <input name="width" inputmode="decimal" required value={m(bed?.widthCm)} /></label>
	</div>
	<p class="muted">Die Reihen laufen entlang der Länge und liegen über die Breite nebeneinander.</p>
	<label
		>Reihen-Richtung auf dem Plan
		<select name="rowDirection" value={bed?.rowDirection ?? 'HORIZONTAL'}>
			{#each Object.entries(ROW_DIRECTION) as [v, l] (v)}<option value={v}>{l}</option>{/each}
		</select>
	</label>
	<div class="two">
		<label>Position x (m) <input name="x" inputmode="decimal" value={m(bed?.xCm ?? 0)} /></label>
		<label>Position y (m) <input name="y" inputmode="decimal" value={m(bed?.yCm ?? 0)} /></label>
	</div>
	<p class="muted">Abstand der oberen linken Ecke vom Gartenrand (oben links = 0 / 0).</p>
	<label
		>Fruchtfolge
		<select name="rotationMode" value={bed?.rotationMode ?? 'STRICT'}>
			{#each Object.entries(ROTATION_MODE) as [v, l] (v)}<option value={v}>{l}</option>{/each}
		</select>
	</label>
	<label
		>Sonne
		<select name="sun" value={bed?.sun ?? 'FULL'}>
			{#each Object.entries(SUN) as [v, l] (v)}<option value={v}>{l}</option>{/each}
		</select>
	</label>
	<label>Boden <input name="soil" maxlength="200" value={bed?.soilDe ?? ''} placeholder="z. B. sandig, pH 6,8" /></label>
	<label>Notizen <textarea name="notes" rows="2" maxlength="1000">{bed?.notesDe ?? ''}</textarea></label>
	<button class="btn primary" type="submit">{submitLabel}</button>
</form>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		font-weight: 600;
	}
	input,
	select,
	textarea {
		font-weight: 400;
		font-size: 15px;
		padding: 8px 10px;
		border: 1px solid #c9ccc2;
		border-radius: 8px;
		background: #fff;
		min-height: 40px;
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}
	p {
		margin: -4px 0 0;
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
