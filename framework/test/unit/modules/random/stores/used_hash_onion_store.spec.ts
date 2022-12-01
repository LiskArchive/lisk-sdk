/*
 * Copyright © 2021 Lisk Foundation
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

import { StateStore } from '@liskhq/lisk-chain';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import {
	UsedHashOnionsStore,
	UsedHashOnionStoreObject,
} from '../../../../../src/modules/random/stores/used_hash_onions';

describe('UsedHashOnionStore', () => {
	let db: InMemoryDatabase;
	let offchainStore: StateStore;
	let usedHashOnionStore: UsedHashOnionsStore;
	let context: { getOffchainStore: (storePrefix: Buffer, subStorePrefix: Buffer) => StateStore };

	const address = Buffer.from('10');

	beforeEach(async () => {
		db = new InMemoryDatabase();
		offchainStore = new StateStore(db);
		usedHashOnionStore = new UsedHashOnionsStore('random');
		context = {
			getOffchainStore: (storePrefix: Buffer, subStorePrefix: Buffer) =>
				offchainStore.getStore(storePrefix, subStorePrefix),
		};
	});

	describe('filterUsedHashOnion', () => {
		it('should include highest usedHashOnion having height less than provided finalizedHeight and remove the rest', async () => {
			const defaultUsedHashOnionStoreObject: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 9,
					},
					{
						count: 6,
						height: 8,
					},
				],
			};

			const expectedUsedHashOnionStoreObject: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 9,
					},
				],
			};

			const actualUsedHashOnionStoreObject = usedHashOnionStore['_filterUsedHashOnions'](
				defaultUsedHashOnionStoreObject.usedHashOnions,
				10,
			);

			expect(actualUsedHashOnionStoreObject).toEqual(expectedUsedHashOnionStoreObject);
		});
	});

	describe('setLatest', () => {
		it('should update the provided usedHashOnion, corresponding to the the count', async () => {
			const initialValue: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 9,
					},
				],
			};

			const expectedHashOnionStoreObject: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 10,
					},
				],
			};

			await usedHashOnionStore.setLatest(
				context,
				6,
				address,
				{ count: 5, height: 10 },
				initialValue.usedHashOnions,
			);

			const usedHashOnionStoreObject = await usedHashOnionStore.get(context, address);

			expect(usedHashOnionStoreObject).toEqual(expectedHashOnionStoreObject);
		});

		it('should insert the provided usedHashOnion', async () => {
			const initialValue: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 9,
					},
				],
			};

			const expectedHashOnionStoreObject: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 9,
					},
					{
						count: 6,
						height: 10,
					},
				],
			};

			await usedHashOnionStore.setLatest(
				context,
				6,
				address,
				{ count: 6, height: 10 },
				initialValue.usedHashOnions,
			);

			const usedHashOnionStoreObject = await usedHashOnionStore.get(context, address);

			expect(usedHashOnionStoreObject).toEqual(expectedHashOnionStoreObject);
		});

		it('should set usedHashOnions with the result of _filterUsedHashOnion', async () => {
			const filteredUsedHashOnions: UsedHashOnionStoreObject = {
				usedHashOnions: [
					{
						count: 5,
						height: 9,
					},
				],
			};

			usedHashOnionStore['_filterUsedHashOnions'] = jest
				.fn()
				.mockReturnValue(filteredUsedHashOnions);

			await usedHashOnionStore.setLatest(
				context,
				6,
				address,
				filteredUsedHashOnions.usedHashOnions[0],
				filteredUsedHashOnions.usedHashOnions,
			);

			expect(usedHashOnionStore['_filterUsedHashOnions']).toHaveBeenCalledTimes(1);
			expect(usedHashOnionStore['_filterUsedHashOnions']).toHaveBeenCalledWith(
				filteredUsedHashOnions.usedHashOnions,
				6,
			);

			const usedHashOnionStoreObject = await usedHashOnionStore.get(context, address);

			expect(usedHashOnionStoreObject).toEqual(filteredUsedHashOnions);
		});
	});
});
