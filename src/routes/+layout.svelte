<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { NAV } from '#lib/i18n/de.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	// Only the phases that are built so far are reachable
	const BUILT_PHASE = 6;
	const bare = $derived(page.url.pathname === '/anmelden');

	// First visit: the page was loaded before the service worker took over → let it store this page
	$effect(() => {
		if (!('serviceWorker' in navigator) || navigator.serviceWorker.controller) return;
		navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ cache: location.href }));
	});

	// Offline hint for the installed app (spec §4.11)
	let online = $state(true);
	$effect(() => {
		const update = () => (online = navigator.onLine);
		update();
		addEventListener('online', update);
		addEventListener('offline', update);
		return () => {
			removeEventListener('online', update);
			removeEventListener('offline', update);
		};
	});
	const active = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname === href || page.url.pathname.startsWith(href + '/');
</script>

<svelte:head>
	<title>Gardenplaner</title>
</svelte:head>

{#if bare}
	{@render children()}
{:else}
<div class="app">
	<header class="top">
		<a class="brand" href="/">gardenplaner<span aria-hidden="true">_</span></a>
		<nav aria-label="Hauptnavigation">
			{#each NAV as item (item.href)}
				{#if item.phase <= BUILT_PHASE}
					<a href={item.href} class:on={active(item.href)} aria-current={active(item.href) ? 'page' : undefined}
						>{item.label}</a
					>
				{:else}
					<span class="soon" title="Kommt in Phase {item.phase}">{item.label}<small>P{item.phase}</small></span>
				{/if}
			{/each}
		</nav>
		{#if data.loggedIn}
			<form method="POST" action="/abmelden" class="logout" onsubmit={() => navigator.serviceWorker?.controller?.postMessage('logout')}><button type="submit">Abmelden</button></form>
		{/if}
	</header>
	<main class="main">
		{#if !online}
			<p class="note offline" role="status">Offline – du siehst den zuletzt geladenen Stand. Änderungen werden nicht gespeichert.</p>
		{/if}
		{#if !data.authEnabled}
			<p class="note">
				Kein Passwort gesetzt – jeder, der die App erreicht, kann sie benutzen. Vor dem Online-Gang auf dem Server
				<code>pnpm passwort</code> ausführen.
			</p>
		{/if}
		{@render children()}
	</main>
</div>
{/if}

<style>
	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
	.top {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 24px;
		background: rgb(15 20 17 / 0.92);
		backdrop-filter: blur(8px);
		border-bottom: 1px solid var(--line);
	}
	.brand {
		font-family: var(--mono);
		color: var(--green);
		text-decoration: none;
		font-size: 15px;
		padding: 8px 0;
		white-space: nowrap;
	}
	.brand span {
		animation: blink 1.2s steps(1) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.brand span {
			animation: none;
		}
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}
	nav a,
	.soon {
		color: var(--muted);
		text-decoration: none;
		padding: 8px 12px;
		border-radius: 6px;
		font-size: 14px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 36px;
		white-space: nowrap;
	}
	nav a:hover {
		color: var(--ink);
		background: var(--card);
	}
	nav a.on {
		background: var(--card-2);
		color: var(--ink);
		font-weight: 500;
	}
	.soon {
		color: var(--idle);
		cursor: default;
	}
	.soon small {
		font-family: var(--mono);
		font-size: 10px;
		border: 1px solid var(--line);
		border-radius: 4px;
		padding: 0 4px;
	}
	.main {
		flex: 1;
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		padding: 24px;
		min-width: 0;
	}
	.note {
		margin: 0 0 16px;
		padding: 10px 14px;
		border-radius: 8px;
		background: var(--warn-bg);
		border: 1px solid var(--warn-line);
		color: var(--warn-ink);
		font-size: 13px;
	}
	.note code {
		font-family: var(--mono);
	}
	.note.offline {
		background: #142030;
		border-color: #2f4a6b;
		color: var(--info-ink);
	}
	.logout button {
		background: none;
		border: 0;
		color: var(--muted);
		padding: 8px 10px;
		cursor: pointer;
		min-height: 36px;
		white-space: nowrap;
	}
	.logout button:hover {
		color: var(--ink);
	}

	@media (max-width: 800px) {
		.top {
			padding: 4px 8px;
			gap: 8px;
		}
		nav {
			flex-wrap: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
		}
		/* Phone: only show what is usable */
		.soon {
			display: none;
		}
		.main {
			padding: 16px 12px;
		}
	}
</style>
