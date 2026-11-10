// Sources referenced by `sourceRef` in the plant data. Keys are used as-is in the DB.
export interface Source {
	name: string;
	url?: string;
	primary?: boolean;
}

export const SOURCES = {
	BZfE: {
		name: 'BZfE / BLE – Tabelle Aussaat- und Pflanzzeiten',
		url: 'https://www.bzfe.de/fileadmin/resources/Bildung/Tabelle_Aussaat_und_Pflanzzeiten.pdf',
		primary: true
	},
	BUND: {
		name: 'BUND – Mischkultur: gute und schlechte Nachbarn',
		url: 'https://www.bund.net/fileadmin/user_upload_bund/publikationen/naturnahes-gaertnern/Mischkultur-Gemuese-BUND.pdf',
		primary: true
	},
	BfR: {
		name: 'BfR – Glykoalkaloide in Kartoffeln (via Heilpraxisnet, PTAheute)',
		url: 'https://ptaheute.de/aktuelles/2018/05/09/gruen-und-stark-keimend-wann-kartoffelverzehr-riskant-ist'
	},
	VZ: {
		name: 'Verbraucherzentrale NRW – Obst und Gemüse richtig lagern',
		url: 'https://www.verbraucherzentrale.nrw/node/26426'
	},
	BMLUK: {
		name: 'BMLUK (AT) – Tipps zur Lagerung, Ethylen',
		url: 'https://www.bmluk.gv.at/themen/abfall-und-kreislaufwirtschaft/abfallvermeidung/lebensmittel/tipps/lagerung2.html'
	},
	Oekotest: {
		name: 'Öko-Test – Gemüse lagern, Kartoffeln vorkeimen, Tomatenstrunk (BZfE)',
		url: 'https://www.oekotest.de/freizeit-technik/Kartoffeln-anbauen-So-klappt-es-mit-der-eigenen-Ernte_15259_1.html'
	},
	TFA: {
		name: 'TFA-Wissen – Vergiftungssteckbrief Zwiebel',
		url: 'https://kdev.tfa-wissen.de/sites/default/files/2025-08/tfa-wissen.de-vergiftungssteckbrief-zwiebel.pdf'
	},
	Plantura: {
		name: 'Plantura – Gurken, Chili, Tomaten im Gewächshaus',
		url: 'https://www.plantura.garden/gemuese/gurken/gurken-pflanzen'
	},
	Utopia: {
		name: 'Utopia – Paprika/Chili vorziehen, Gurken im Gewächshaus',
		url: 'https://utopia.de/ratgeber/gurken-pflanzen-eine-anleitung-fuer-gewaechshaus-und-balkon'
	},
	toom: {
		name: 'toom – Gurken pflanzen, Kartoffeln vorkeimen',
		url: 'https://toom.de/selbermachen/garten-freizeit/pflanzen/gemuese-anbauen/gurken-pflanzen/'
	},
	BayWa: {
		name: 'BayWa – Produktblatt Phacelia',
		url: 'https://res.cloudinary.com/baywa-ag-p/raw/upload/f_auto/A18342697.pdf'
	},
	selbst: {
		name: 'selbst.de – Gründüngung mit Gelbsenf',
		url: 'https://selbst.de/gruenduengung-mit-gelbsenf-54764.html'
	},
	Hornbach: {
		name: 'Hornbach – Mischkultur im Garten',
		url: 'https://www.hornbach.at/projekte/mischkultur-im-garten/'
	},
	LWG: {
		name: 'LWG Bayern / Bayerische Gartenakademie – Kartoffeln im Garten (3 kg Pflanzgut für 10 m²)',
		url: 'https://www.lwg.bayern.de/mam/cms06/gartenakademie/dateien/2153-2020.pdf'
	},
	Keimzeit: {
		name: 'Keimzeit – Tomatenkatalog 2026 (Wuchshöhen Stabtomaten)',
		url: 'https://www.keimzeit-saatgut.de/media/pdf/70/32/44/tomaten-2026.pdf'
	},
	Gartenjournal: {
		name: 'Gartenjournal – Gurken-Rankhilfe (Rankhöhe 1–2 m)',
		url: 'https://www.gartenjournal.net/gurken-rankhilfe'
	},
	NaturaDB: {
		name: 'NaturaDB – Himbeere (Rubus idaeus), Wuchshöhe',
		url: 'https://www.naturadb.de/pflanzen/rubus-idaeus/'
	},
	Praxis: {
		name: 'Allgemeine Gartenpraxis (noch nicht einzeln belegt)'
	}
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof SOURCES;

/** Splits a `sourceRef` like "BZfE, Plantura" into known sources. */
export function parseSourceRef(ref: string | null | undefined): Source[] {
	if (!ref) return [];
	return ref
		.split(/[,;]\s*/)
		.map((k) => SOURCES[k.trim() as SourceKey])
		.filter((s): s is Source => Boolean(s));
}
