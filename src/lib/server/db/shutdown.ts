import type { EventEmitter } from 'node:events';

/**
 * adapter-node emits `sveltekit:shutdown` after SIGTERM/SIGINT once the HTTP server is closed.
 * The open Postgres pool would otherwise keep the process alive (`docker stop` waits 10 s, then kills).
 */
export function closeOnShutdown(
	proc: Pick<EventEmitter, 'once'>,
	client: { end: (options: { timeout: number }) => Promise<void> }
): void {
	proc.once('sveltekit:shutdown', () => client.end({ timeout: 5 }));
}
