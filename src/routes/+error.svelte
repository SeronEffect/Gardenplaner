<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Fehler {page.status} – Gardenplaner</title></svelte:head>

<section class="card">
	{#if page.error?.dbDown}
		<h1>Datenbank nicht erreichbar</h1>
		<ol>
			<li>Docker Desktop starten.</li>
			<li>Im Projektordner <code>docker compose up -d db</code> ausführen.</li>
			<li>Diese Seite neu laden.</li>
		</ol>
	{:else if page.status === 404}
		<h1>Seite nicht gefunden</h1>
		<p>{page.error?.message}</p>
	{:else}
		<h1>Fehler {page.status}</h1>
		<p>{page.error?.message}</p>
	{/if}
	<p><a href="/">Zur Übersicht</a></p>
</section>

<style>
	.card {
		background: var(--card);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		padding: 20px 24px;
		max-width: 560px;
	}
	h1 {
		font-size: 20px;
		margin-bottom: 10px;
	}
</style>
