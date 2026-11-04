// Looks up a representative picture for a German Wikipedia article (its page image)
// plus author and licence from Wikimedia Commons.

export const USER_AGENT = 'Gardenplaner/0.1 (https://github.com/SeronEffect/Gardenplaner)';

export interface PlantImage {
	url: string;
	credit: string;
	license: string;
	pageUrl: string;
}

type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const get = async (fetchFn: Fetch, url: string) => {
	const res = await fetchFn(url);
	if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
	return res.json() as Promise<any>;
};

/** Removes HTML tags and collapses whitespace (Commons "Artist" is HTML). */
export function stripHtml(html: string): string {
	return html
		.replace(/<[^>]*>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

export function pageImageName(json: any): string | null {
	const pages = json?.query?.pages ?? {};
	for (const p of Object.values<any>(pages)) if (p?.pageimage) return p.pageimage as string;
	return null;
}

export function parseImageInfo(json: any): PlantImage | null {
	const pages = json?.query?.pages ?? {};
	for (const p of Object.values<any>(pages)) {
		const info = p?.imageinfo?.[0];
		if (!info) continue;
		const meta = info.extmetadata ?? {};
		return {
			url: info.thumburl ?? info.url,
			credit: stripHtml(meta.Artist?.value ?? 'unbekannt'),
			license: stripHtml(meta.LicenseShortName?.value ?? 'unbekannt'),
			pageUrl: info.descriptionurl
		};
	}
	return null;
}

export async function findPlantImage(
	wikiTitle: string,
	fetchFn: Fetch = (url) => fetch(url, { headers: { 'User-Agent': USER_AGENT } })
): Promise<PlantImage | null> {
	const pageUrl =
		'https://de.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=name&titles=' +
		encodeURIComponent(wikiTitle);
	const file = pageImageName(await get(fetchFn, pageUrl));
	if (!file) return null;
	const infoUrl =
		'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&titles=' +
		encodeURIComponent(`File:${file}`);
	return parseImageInfo(await get(fetchFn, infoUrl));
}
