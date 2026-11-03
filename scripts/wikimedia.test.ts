import { describe, expect, it } from 'vitest';
import { findPlantImage, stripHtml } from './wikimedia.ts';

// Shapes taken from the MediaWiki API (prop=pageimages, prop=imageinfo&iiprop=url|extmetadata)
const pageImages = { query: { pages: { '123': { pageid: 123, title: 'Tomate', pageimage: 'Tomato_je.jpg' } } } };
const imageInfo = {
	query: {
		pages: {
			'-1': {
				title: 'File:Tomato je.jpg',
				imageinfo: [
					{
						thumburl: 'https://upload.wikimedia.org/thumb/Tomato_je.jpg/800px-Tomato_je.jpg',
						url: 'https://upload.wikimedia.org/Tomato_je.jpg',
						descriptionurl: 'https://commons.wikimedia.org/wiki/File:Tomato_je.jpg',
						extmetadata: {
							Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Jengod">Jengod</a> &amp; friends' },
							LicenseShortName: { value: 'CC BY-SA 3.0' }
						}
					}
				]
			}
		}
	}
};

const fakeFetch = (responses: Record<string, unknown>) => async (url: string) => {
	const key = Object.keys(responses).find((k) => url.includes(k));
	return { ok: !!key, status: key ? 200 : 404, json: async () => (key ? responses[key] : {}) };
};

describe('wikimedia', () => {
	it('strips HTML from credits', () => {
		expect(stripHtml('<a href="x">Max</a>  &amp;   Co')).toBe('Max & Co');
	});

	it('finds the page image with licence and author', async () => {
		const img = await findPlantImage(
			'Tomate',
			fakeFetch({ 'de.wikipedia.org': pageImages, 'commons.wikimedia.org': imageInfo })
		);
		expect(img).toEqual({
			url: 'https://upload.wikimedia.org/thumb/Tomato_je.jpg/800px-Tomato_je.jpg',
			credit: 'Jengod & friends',
			license: 'CC BY-SA 3.0',
			pageUrl: 'https://commons.wikimedia.org/wiki/File:Tomato_je.jpg'
		});
	});

	it('returns null when the article has no picture', async () => {
		const img = await findPlantImage('X', fakeFetch({ 'de.wikipedia.org': { query: { pages: { '1': {} } } } }));
		expect(img).toBeNull();
	});
});
