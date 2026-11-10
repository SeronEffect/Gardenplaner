// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			/** Set when the database cannot be reached (spec §4.12) */
			dbDown?: boolean;
		}
		interface Locals {
			/** A password is set (spec §4.10) */
			authEnabled: boolean;
			loggedIn: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
