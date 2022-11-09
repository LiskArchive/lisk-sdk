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
import {
	HASH_LENGTH,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../src/modules/interoperability/constants';
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
		chainAccountStore = new ChainAccountStore(MODULE_NAME_INTEROPERABILITY);
		for (const index of [0, 1, 2]) {
			await chainAccountStore.set(context, chainIDs[index], {
				lastCertificate: {
					height: 0,
					stateRoot: utils.getRandomBytes(HASH_LENGTH),
					timestamp: 100 + index,
					validatorsHash: utils.getRandomBytes(HASH_LENGTH),
				},
				name: `chain${index + 1}`,
				status: 0,
			});
		}
	});

	describe('getAllAccounts', () => {
		it('should get all accounts starting from the specified chainID', async () => {
			const chainAccounts = await chainAccountStore.getAllAccounts(context, chainIDs[1]);

			expect(chainAccounts).toHaveLength(2);
			expect(chainAccounts[0].name).toEqual('chain2');
			expect(chainAccounts[1].name).toEqual('chain3');
		});
	});
});
