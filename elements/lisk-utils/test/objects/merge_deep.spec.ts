/*
 * Copyright © 2020 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
import { mergeDeep } from '../../src/objects/merge_deep';

describe('mergeDeep', () => {
	it('should merge multiple sources to destination', () => {
		const result = mergeDeep(
			{},
			{ a: undefined, b: true, c: Buffer.from('123') },
			{ a: 3, d: 'string', e: { nested: BigInt(4) } },
		) as any;

		expect(result.a).toBe(3);
		expect(result.b).toBe(true);
		expect(result.c).toEqual(Buffer.from('123'));
		expect(result.d).toBe('string');
		expect(result.e).toEqual({ nested: BigInt(4) });
	});

	it('should not mutate the sources', () => {
		const before = { a: undefined, b: true, c: Buffer.from('123') };
		const result = mergeDeep({}, before, {
			a: 3,
			d: 'string',
			e: { nested: BigInt(4) },
		}) as any;

		expect(before.a).toBeUndefined();
		expect(result.b).toBe(true);
		expect(result.c).toEqual(Buffer.from('123'));
	});

	it('should not overwrite if undefined', () => {
		const result = mergeDeep(
			{},
			{ a: undefined, b: true, c: Buffer.from('123'), f: 99 },
			{ a: 3, d: 'string', e: { nested: BigInt(4) }, f: undefined },
		) as any;

		expect(result.a).toBe(3);
		expect(result.b).toBe(true);
		expect(result.c).toEqual(Buffer.from('123'));
		expect(result.d).toBe('string');
		expect(result.e).toEqual({ nested: BigInt(4) });
		expect(result.f).toBe(99);
	});
});
