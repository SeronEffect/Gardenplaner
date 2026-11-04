<script lang="ts">
	import BedForm from '#lib/components/BedForm.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<h2>Neues Beet</h2>
<BedForm action="" submitLabel="Beet anlegen" errors={form?.errors ?? []} />

<style>
	h2 {
		font-size: 18px;
		margin-bottom: 12px;
	}
</style>
