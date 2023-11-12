/*
 * Copyright © 2023 Lisk Foundation
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

import { Schema } from '@liskhq/lisk-codec';
import { MethodContext } from '../../../src';
import { BaseStore, computeSubstorePrefix } from '../../../src/modules/base_store';
import { createTransientMethodContext } from '../../../src/testing';

class SampleStore extends BaseStore<undefined> {
	public schema: Schema = {
		$id: '/lisk/test/sample',
		type: 'object',
		properties: {},
	};

	public get storePrefix(): Buffer {
		return Buffer.from([1, 2, 3, 4]);
	}
}

describe('BaseStore', () => {
	const storePrefix = Buffer.from([1, 2, 3, 4]);
	const substorePrefix = computeSubstorePrefix(0);
	const key = Buffer.from([1, 2]);

	let store: SampleStore;
	let context: MethodContext;

	beforeEach(() => {
		store = new SampleStore('sample', 0);
		context = createTransientMethodContext({});
	});

	describe('computeSubstorePrefix', () => {
		const cases = [
			[{ index: 0, expected: Buffer.from([0x00, 0x00]) }],
			[{ index: 1, expected: Buffer.from([0x80, 0x00]) }],
			[{ index: 2, expected: Buffer.from([0x40, 0x00]) }],
			[{ index: 3, expected: Buffer.from([0xc0, 0x00]) }],
			[{ index: 4, expected: Buffer.from([0x20, 0x00]) }],
			[{ index: 5, expected: Buffer.from([0xa0, 0x00]) }],
			[{ index: 6, expected: Buffer.from([0x60, 0x00]) }],
			[{ index: 7, expected: Buffer.from([0xe0, 0x00]) }],
			[{ index: 8, expected: Buffer.from([0x10, 0x00]) }],
			[{ index: 9, expected: Buffer.from([0x90, 0x00]) }],
			[{ index: 10, expected: Buffer.from([0x50, 0x00]) }],
			[{ index: 11, expected: Buffer.from([0xd0, 0x00]) }],
		];

		it.each(cases)('should produce expected key', ({ index, expected }) => {
			expect(computeSubstorePrefix(index)).toEqual(expected);
		});
	});

	describe('key', () => {
		it('should return concat of storePrefix and substorePrefix', () => {
			expect(store.key).toEqual(Buffer.concat([storePrefix, substorePrefix]));
		});
	});

	describe('get', () => {
		it('should resolve when key exists', async () => {
			const expectedStore = context.getStore(storePrefix, substorePrefix);
			await expectedStore.set(key, Buffer.alloc(0));

			await expect(store.get(context, key)).toResolve();
		});
	});

	describe('has', () => {
		it('should return true when key exist', async () => {
			const expectedStore = context.getStore(storePrefix, substorePrefix);
			await expectedStore.set(key, Buffer.alloc(0));

			await expect(store.has(context, key)).resolves.toBeTrue();
		});

		it('should return false when key does not exist', async () => {
			await expect(store.has(context, key)).resolves.toBeFalse();
		});
	});

	describe('set', () => {
		it('should store data with the key', async () => {
			await store.set(context, key, undefined);

			const expectedStore = context.getStore(storePrefix, substorePrefix);

			await expect(expectedStore.has(key)).resolves.toBeTrue();
		});
	});

	describe('del', () => {
		it('should store data with the key', async () => {
			await store.set(context, key, undefined);
			const expectedStore = context.getStore(storePrefix, substorePrefix);

			await expect(expectedStore.has(key)).resolves.toBeTrue();

			await store.del(context, key);

			await expect(expectedStore.has(key)).resolves.toBeFalse();
		});
	});

	describe('iterate', () => {
		it('should resolve when key exists', async () => {
			const expectedStore = context.getStore(storePrefix, substorePrefix);
			await expectedStore.set(key, Buffer.alloc(0));

			const keypairs = await store.iterate(context, {});
			expect(keypairs).toHaveLength(1);
			expect(keypairs[0].key).toEqual(key);
		});
	});
});
