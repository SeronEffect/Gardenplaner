// Small helpers to read and validate form fields; errors are collected as German messages.
export class FormReader {
	errors: string[] = [];
	constructor(private fd: FormData) {}

	str(name: string, label: string, { required = false, max = 500 } = {}): string | null {
		const v = String(this.fd.get(name) ?? '').trim();
		if (!v) {
			if (required) this.errors.push(`${label}: Pflichtfeld.`);
			return null;
		}
		if (v.length > max) this.errors.push(`${label}: höchstens ${max} Zeichen.`);
		return v;
	}

	int(name: string, label: string, { required = false, min = -1e9, max = 1e9 } = {}): number | null {
		const raw = String(this.fd.get(name) ?? '').trim().replace(',', '.');
		if (!raw) {
			if (required) this.errors.push(`${label}: Pflichtfeld.`);
			return null;
		}
		const n = Number(raw);
		if (!Number.isFinite(n) || !Number.isInteger(n)) {
			this.errors.push(`${label}: bitte eine ganze Zahl angeben.`);
			return null;
		}
		if (n < min || n > max) this.errors.push(`${label}: erlaubt ${min} bis ${max}.`);
		return n;
	}

	/** Metres with decimals (e.g. "4,5") → whole centimetres */
	metres(name: string, label: string, { required = false, min = 0, max = 1000 } = {}): number | null {
		const raw = String(this.fd.get(name) ?? '').trim().replace(',', '.');
		if (!raw) {
			if (required) this.errors.push(`${label}: Pflichtfeld.`);
			return null;
		}
		const n = Number(raw);
		if (!Number.isFinite(n) || n < min || n > max) {
			this.errors.push(
				`${label}: bitte eine Zahl zwischen ${min.toLocaleString('de-DE')} und ${max.toLocaleString('de-DE')} m angeben.`
			);
			return null;
		}
		return Math.round(n * 100);
	}

	oneOf<T extends string>(name: string, label: string, allowed: readonly T[], fallback?: T): T {
		const v = String(this.fd.get(name) ?? '');
		if ((allowed as readonly string[]).includes(v)) return v as T;
		if (fallback !== undefined) return fallback;
		this.errors.push(`${label}: ungültiger Wert.`);
		return allowed[0];
	}

	date(name: string, label: string): string | null {
		const v = String(this.fd.get(name) ?? '').trim();
		if (!v) return null;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) {
			this.errors.push(`${label}: ungültiges Datum.`);
			return null;
		}
		return v;
	}

	bool(name: string): boolean {
		return this.fd.get(name) === 'on';
	}
}
