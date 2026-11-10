import { describe, expect, it } from 'vitest';
import { isDbUnavailable } from './unavailable.ts';

const withCode = (code: string) => Object.assign(new Error('x'), { code });

describe('isDbUnavailable', () => {
	it('recognises connection errors, also wrapped', () => {
		expect(isDbUnavailable(withCode('ECONNREFUSED'))).toBe(true);
		expect(isDbUnavailable(withCode('ENOTFOUND'))).toBe(true);
		expect(isDbUnavailable(withCode('CONNECT_TIMEOUT'))).toBe(true);
		expect(isDbUnavailable(new Error('Failed query', { cause: withCode('ECONNREFUSED') }))).toBe(true);
		expect(isDbUnavailable(new AggregateError([withCode('ECONNREFUSED')]))).toBe(true);
	});

	it('ignores other errors', () => {
		expect(isDbUnavailable(new Error('boom'))).toBe(false);
		expect(isDbUnavailable(withCode('23505'))).toBe(false);
		expect(isDbUnavailable(undefined)).toBe(false);
	});
});
