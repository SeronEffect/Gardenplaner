// Map colours per plant (rows on the garden plan). Text on top is dark unless `light` is set.
const COLORS: Record<string, { bg: string; light?: boolean }> = {
	tomate: { bg: '#d9644a', light: true },
	gurke: { bg: '#6fa36b' },
	salat: { bg: '#9bc97a' },
	radieschen: { bg: '#e58fa6' },
	zwiebel: { bg: '#d7c8ec' },
	moehre: { bg: '#e69a3c' },
	kartoffel: { bg: '#c9a56b' },
	erdbeere: { bg: '#e36d7d' },
	himbeere: { bg: '#a84b6e', light: true },
	paprika: { bg: '#e9b44c' },
	chili: { bg: '#b83226', light: true },
	phacelia: { bg: '#8fa8d9' },
	gelbsenf: { bg: '#e8d75a' }
};

const FALLBACK = ['#7fb3a3', '#b5a3d1', '#d1b48c', '#9cc2d6', '#c9d98a'];

export function plantColor(slug: string): { bg: string; fg: string } {
	const c = COLORS[slug];
	if (c) return { bg: c.bg, fg: c.light ? '#ffffff' : '#1f2a1f' };
	let h = 0;
	for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return { bg: FALLBACK[h % FALLBACK.length], fg: '#1f2a1f' };
}
