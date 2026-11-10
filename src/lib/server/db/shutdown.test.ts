import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { closeOnShutdown } from './shutdown.ts';

// bug-fix-003: the open Postgres pool kept `node build` alive after SIGTERM.
describe('closeOnShutdown', () => {
	it('closes the database client when adapter-node finishes its graceful shutdown', async () => {
		const proc = new EventEmitter();
		const client = { end: vi.fn(async () => {}) };
		closeOnShutdown(proc, client);

		proc.emit('sveltekit:shutdown', 'SIGTERM');
		await Promise.resolve();

		expect(client.end).toHaveBeenCalledTimes(1);
		expect(client.end).toHaveBeenCalledWith({ timeout: 5 });
	});

	it('does nothing before the shutdown event', () => {
		const client = { end: vi.fn(async () => {}) };
		closeOnShutdown(new EventEmitter(), client);
		expect(client.end).not.toHaveBeenCalled();
	});
});
