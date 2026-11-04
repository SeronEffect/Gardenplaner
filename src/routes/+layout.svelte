<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { NAV } from '#lib/i18n/de.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Only the phases that are built so far are reachable
	const BUILT_PHASE = 2;
	const active = (href: string) => page.url.pathname === href || page.url.pathname.startsWith(href + '/');
</script>

<svelte:head>
	<title>Gardenplaner</title>
</svelte:head>

<div class="app">
	<nav class="side" aria-label="Hauptnavigation">
		<a class="brand" href="/gartenplan">Gardenplaner</a>
		{#each NAV as item (item.href)}
			{#if item.phase <= BUILT_PHASE}
				<a href={item.href} class:on={active(item.href)} aria-current={active(item.href) ? 'page' : undefined}
					>{item.label}</a
				>
			{:else}
				<span class="soon" title="Kommt in Phase {item.phase}">{item.label}<small>bald</small></span>
			{/if}
		{/each}
	</nav>
	<main class="main">
		{@render children()}
	</main>
</div>

<style>
	.app {
		display: grid;
		grid-template-columns: 220px 1fr;
		min-height: 100vh;
	}
	.side {
		background: var(--green-dark);
		padding: 24px 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		position: sticky;
		top: 0;
		height: 100vh;
	}
	.brand {
		color: #fff;
		font-weight: 700;
		font-size: 18px;
		padding: 8px 12px 18px;
		text-decoration: none;
	}
	.side a:not(.brand),
	.soon {
		color: #e8efe6;
		text-decoration: none;
		padding: 10px 12px;
		border-radius: 8px;
		font-size: 15px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.side a:not(.brand):hover {
		background: #2a4a33;
		color: #fff;
	}
	.side a.on {
		background: var(--green);
		color: #fff;
		font-weight: 600;
	}
	.soon {
		color: #a9bba6;
		cursor: default;
	}
	.soon small {
		font-size: 11px;
		border: 1px solid #5c7a63;
		border-radius: 999px;
		padding: 0 6px;
	}
	.main {
		padding: 28px 32px;
		min-width: 0;
	}

	@media (max-width: 800px) {
		.app {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr;
		}
		.side {
			height: auto;
			flex-direction: row;
			overflow-x: auto;
			padding: 8px;
			z-index: 10;
		}
		.brand {
			padding: 10px 8px;
			font-size: 16px;
		}
		/* Phone: only show what is usable */
		.soon {
			display: none;
		}
		.main {
			padding: 16px;
		}
	}
</style>
