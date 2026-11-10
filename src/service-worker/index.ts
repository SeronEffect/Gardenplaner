// PWA and offline (spec §4.11): app files cache-first, pages network-first with the last copy as
// fallback, so the week's tasks stay readable in the garden without signal.
// SvelteKit 3: build files in `$app/manifest` (immutable = built JS/CSS, assets = static/)
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const APP = `app-${version}`;
const PAGES = 'pages';
const ASSETS = new Set([...immutable, ...assets].map((a) => a.path as string));

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(APP)
			.then((c) => c.addAll([...ASSETS]))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== APP && k !== PAGES).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

const OFFLINE_HTML = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline – Gardenplaner</title><body style="font:15px/1.5 system-ui,sans-serif;padding:24px;background:#f6f6f2;color:#1f2a1f">
<h1 style="font-size:20px">Offline</h1><p>Diese Seite war noch nicht gespeichert. Öffne sie einmal mit Netz, dann ist sie auch offline lesbar.</p>
<p><a href="/garten" style="color:#2f6b3a">Zum Gartenmodus</a></p></body></html>`;

/** Only keep real pages (no login redirects, no errors) */
async function store(request: Request | string, response: Response) {
	if (response.ok && !response.redirected && response.type === 'basic') {
		await (await caches.open(PAGES)).put(request, response.clone());
	}
}

async function networkFirst(request: Request): Promise<Response> {
	const cache = await caches.open(PAGES);
	try {
		const response = await fetch(request);
		await store(request, response);
		return response;
	} catch {
		const cached = await cache.match(request);
		if (cached) return cached;
		if (request.mode === 'navigate') {
			return new Response(OFFLINE_HTML, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } });
		}
		throw new Error('offline');
	}
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin || url.pathname.startsWith('/anmelden')) return;
	if (ASSETS.has(url.pathname)) {
		event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request)));
		return;
	}
	if (request.mode === 'navigate' || url.pathname.endsWith('/__data.json')) {
		event.respondWith(networkFirst(request));
	}
});

// Messages from the layout: logout clears the stored pages; `{ cache: url }` stores the page that was
// loaded before the service worker took control (first visit), so it is readable offline too.
sw.addEventListener('message', (event) => {
	if (event.data === 'logout') event.waitUntil(caches.delete(PAGES));
	const url = (event.data as { cache?: string } | null)?.cache;
	if (url && new URL(url).origin === sw.location.origin) {
		event.waitUntil(fetch(url).then((r) => store(url, r)).catch(() => {}));
	}
});
