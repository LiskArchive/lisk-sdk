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

import { NFTStore } from '../../../../../src/modules/nft/stores/nft';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing';
import { createStoreGetter } from '../../../../../src/testing/utils';
import { LENGTH_NFT_ID } from '../../../../../src/modules/nft/constants';
import { Modules } from '../../../../../src';

describe('NFTStore', () => {
	let store: NFTStore;
	let context: Modules.StoreGetter;

	beforeEach(() => {
		store = new NFTStore('NFT', 5);

		const db = new InMemoryPrefixedStateDB();
		const stateStore = new PrefixedStateReadWriter(db);

		context = createStoreGetter(stateStore);
	});

	describe('save', () => {
		it('should order NFTs of an owner by module', async () => {
			const nftID = Buffer.alloc(LENGTH_NFT_ID, 0);
			const owner = Buffer.alloc(8, 1);

			const unsortedAttributesArray = [
				{
					module: 'token',
					attributes: Buffer.alloc(8, 1),
				},
				{
					module: 'pos',
					attributes: Buffer.alloc(8, 1),
				},
			];

			const sortedAttributesArray = [
				{
					module: 'pos',
					attributes: Buffer.alloc(8, 1),
				},
				{
					module: 'token',
					attributes: Buffer.alloc(8, 1),
				},
			];

			await store.save(context, nftID, {
				owner,
				attributesArray: unsortedAttributesArray,
			});

			await expect(store.get(context, nftID)).resolves.toEqual({
				owner,
				attributesArray: sortedAttributesArray,
			});
		});

		it('should remove modules with no attributes array', async () => {
			const nftID = Buffer.alloc(LENGTH_NFT_ID, 0);
			const owner = Buffer.alloc(8, 1);

			const attributesArray = [
				{
					module: 'nft',
					attributes: Buffer.alloc(0),
				},
				{
					module: 'pos',
					attributes: Buffer.alloc(8, 1),
				},
			];

			const filteredAttributesArray = [
				{
					module: 'pos',
					attributes: Buffer.alloc(8, 1),
				},
			];

			await store.save(context, nftID, {
				owner,
				attributesArray,
			});

			await expect(store.get(context, nftID)).resolves.toEqual({
				owner,
				attributesArray: filteredAttributesArray,
			});
		});
	});
});
