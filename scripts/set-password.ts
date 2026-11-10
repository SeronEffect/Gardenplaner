// Sets or removes the login password (spec §4.10). Runs on the server only – never via the web page.
//   pnpm passwort              → asks twice for the new password
//   pnpm passwort --entfernen  → removes the password (app is open again)
// Non-interactive (e.g. Docker): echo -e "pw\npw" | node --experimental-strip-types scripts/set-password.ts
import { createInterface } from 'node:readline';
import postgres from 'postgres';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../src/lib/server/auth.ts';

async function ask(question: string, hidden: boolean): Promise<string> {
	const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
	if (hidden && process.stdin.isTTY) {
		// Hide the typed characters
		const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
		out._writeToOutput = (s: string) => out.output.write(s.startsWith(question) ? question : s.includes('\n') ? '\n' : '');
	}
	return new Promise((resolve) => rl.question(question, (a) => (rl.close(), resolve(a))));
}

async function readStdinLines(): Promise<string[]> {
	const lines: string[] = [];
	for await (const line of createInterface({ input: process.stdin })) lines.push(line);
	return lines;
}

async function main() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL fehlt (siehe .env.example).');
	const sql = postgres(url, { max: 1, onnotice: () => {} });
	try {
		if (process.argv.includes('--entfernen')) {
			await sql`update settings set password_hash = null where id = 1`;
			console.log('Passwort entfernt – die App ist ohne Anmeldung erreichbar.');
			return;
		}
		let first: string;
		let second: string;
		if (process.stdin.isTTY) {
			first = await ask('Neues Passwort: ', true);
			second = await ask('Wiederholen:    ', true);
		} else {
			[first = '', second = ''] = await readStdinLines();
		}
		if (first.length < MIN_PASSWORD_LENGTH) throw new Error(`Mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`);
		if (first !== second) throw new Error('Die beiden Eingaben stimmen nicht überein.');
		const res = await sql`update settings set password_hash = ${await hashPassword(first)} where id = 1`;
		if (res.count !== 1) throw new Error('Keine Einstellungen gefunden – die App einmal starten, dann erneut versuchen.');
		console.log('Passwort gesetzt. Alle bisherigen Anmeldungen sind damit abgemeldet.');
	} finally {
		await sql.end();
	}
}

main().catch((err) => {
	console.error(`Fehler: ${err instanceof Error ? err.message : err}`);
	process.exit(1);
});
