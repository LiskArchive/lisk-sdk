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

import { utils } from '@liskhq/lisk-cryptography';
import { StoreGetter } from '../../../../../src';
import { ChainAccountStore } from '../../../../../src/modules/interoperability/stores/chain_account';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('ChainAccountStore', () => {
	let context: StoreGetter;
	let chainAccountStore: ChainAccountStore;

	const chainIDs = [
		Buffer.from([0, 0, 0, 0]),
		Buffer.from([0, 0, 1, 0]),
		Buffer.from([0, 0, 2, 0]),
	];

	beforeEach(async () => {
		context = createStoreGetter(new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()));
		chainAccountStore = new ChainAccountStore('interoperability');
		await chainAccountStore.set(context, chainIDs[0], {
			lastCertificate: {
				height: 0,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 100,
				validatorsHash: utils.getRandomBytes(32),
			},
			name: 'chain1',
			status: 0,
		});
		await chainAccountStore.set(context, chainIDs[1], {
			lastCertificate: {
				height: 1,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 101,
				validatorsHash: utils.getRandomBytes(32),
			},
			name: 'chain2',
			status: 0,
		});
		await chainAccountStore.set(context, chainIDs[2], {
			lastCertificate: {
				height: 2,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 102,
				validatorsHash: utils.getRandomBytes(32),
			},
			name: 'chain3',
			status: 0,
		});
	});

	describe('getAllAccounts', () => {
		it('should get all account starting from the specified chainID', async () => {
			const result = await chainAccountStore.getAllAccounts(context, chainIDs[1]);

			expect(result).toHaveLength(2);
			expect(result[0].name).toEqual('chain2');
			expect(result[1].name).toEqual('chain3');
		});
	});

	describe('updateLastCertificate', () => {
		it('should update the last certificate of the specified account and return updated account', async () => {
			const updatedCertificate = {
				height: 99,
				stateRoot: utils.getRandomBytes(32),
				timestamp: 999,
				validatorsHash: utils.getRandomBytes(32),
			};
			const result = await chainAccountStore.updateLastCertificate(
				context,
				chainIDs[0],
				updatedCertificate,
			);

			expect(result.lastCertificate).toEqual(updatedCertificate);

			const updated = await chainAccountStore.get(context, chainIDs[0]);
			expect(updated.lastCertificate).toEqual(updatedCertificate);
		});
	});
});
