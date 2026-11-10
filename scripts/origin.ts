// Origin of the app, baked into the production build as `kit.paths.origin` (used by the CSRF check).
// adapter-node 6 no longer reads ORIGIN at runtime (bug-fix-002), so set ORIGIN when *building*:
//   ORIGIN=https://garten.example.de pnpm build   (Docker: --build-arg ORIGIN=…)
export const DEFAULT_ORIGIN = 'http://localhost:3000';

export function appOrigin(env: Record<string, string | undefined>): string {
	const raw = env.ORIGIN?.trim();
	if (!raw) return DEFAULT_ORIGIN;
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error(`ORIGIN must be a full origin like ${DEFAULT_ORIGIN}, got "${raw}"`);
	}
	if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
		throw new Error(`ORIGIN must be a bare http(s) origin without path, got "${raw}"`);
	}
	return url.origin;
}
