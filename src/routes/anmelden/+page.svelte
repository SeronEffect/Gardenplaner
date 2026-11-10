<script lang="ts">
	import type { PageProps } from './$types';
	let { form }: PageProps = $props();
</script>

<svelte:head><title>Anmelden – Gardenplaner</title></svelte:head>

<main class="login">
	<form method="POST" class="card">
		<h1>Gardenplaner</h1>
		<label for="pw">Passwort</label>
		<input id="pw" name="password" type="password" autocomplete="current-password" required />
		{#if form?.error}<p class="err" role="alert">{form.error}</p>{/if}
		<button class="btn primary" type="submit">Anmelden</button>
	</form>
</main>

<style>
	.login {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 16px;
		background: var(--bg);
	}
	.card {
		background: var(--card);
		border-radius: var(--radius);
		padding: 28px;
		width: min(360px, 100%);
		display: grid;
		gap: 10px;
	}
	h1 {
		font-size: 22px;
		margin-bottom: 8px;
	}
	label {
		font-size: 13px;
		color: var(--muted);
	}
	input {
		min-height: 44px;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 8px 12px;
		font: inherit;
	}
	.err {
		color: var(--bad-ink);
		margin: 0;
	}
	button {
		justify-content: center;
		margin-top: 6px;
	}
</style>
