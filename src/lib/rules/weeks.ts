// ISO calendar weeks (KW) – weeks start on Monday. Dates are ISO strings (YYYY-MM-DD), UTC-based.

const DAY = 86_400_000;
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
export const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDaysIso(iso: string, days: number): string {
	return toIso(new Date(toDate(iso).getTime() + days * DAY));
}

/** Monday of the week containing the date. */
export function mondayOf(iso: string): string {
	const d = toDate(iso);
	const dow = (d.getUTCDay() + 6) % 7; // 0 = Monday
	return addDaysIso(iso, -dow);
}

/** ISO week number and week-year ("KW 1" is the week with the first Thursday). */
export function isoWeek(iso: string): { year: number; week: number } {
	const thursday = addDaysIso(mondayOf(iso), 3);
	const year = Number(thursday.slice(0, 4));
	const firstThursday = addDaysIso(mondayOf(`${year}-01-04`), 3);
	return { year, week: Math.round((toDate(thursday).getTime() - toDate(firstThursday).getTime()) / (7 * DAY)) + 1 };
}

/** "2027-W19" */
export function weekId(iso: string): string {
	const { year, week } = isoWeek(iso);
	return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Monday of a week id like "2027-W19"; null if invalid. */
export function mondayOfWeekId(id: string): string | null {
	const m = /^(\d{4})-W(\d{2})$/.exec(id);
	if (!m) return null;
	const year = Number(m[1]);
	const week = Number(m[2]);
	if (week < 1 || week > 53) return null;
	const monday = addDaysIso(mondayOf(`${year}-01-04`), (week - 1) * 7);
	return isoWeek(monday).year === year ? monday : null;
}

/** Today in Germany (the server may run in UTC). */
export function todayIso(timeZone = 'Europe/Berlin'): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Do two date windows overlap (inclusive)? */
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart <= bEnd && bStart <= aEnd;
