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

import { utils as cryptoUtils } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { StoreGetter } from '../../../../../src/modules/base_store';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('ChannelDataStore', () => {
	let context: StoreGetter;
	let channelDataStore: ChannelDataStore;

	const chainID = Buffer.from([0, 0, 0, 0]);
	const mockChannelData = {
		inbox: {
			appendPath: [cryptoUtils.getRandomBytes(32)],
			root: cryptoUtils.getRandomBytes(32),
			size: 1,
		},
		messageFeeTokenID: cryptoUtils.getRandomBytes(8),
		outbox: {
			appendPath: [cryptoUtils.getRandomBytes(32)],
			root: cryptoUtils.getRandomBytes(32),
			size: 1,
		},
		partnerChainOutboxRoot: cryptoUtils.getRandomBytes(32),
	};

	beforeEach(async () => {
		context = createStoreGetter(new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()));
		channelDataStore = new ChannelDataStore('interoperability');
		await channelDataStore.set(context, chainID, mockChannelData);
	});

	describe('updatePartnerChainOutboxRoot', () => {
		it('should update the partnerChainOutboxRoot with result of calculateRootFromRightWitness', async () => {
			const expected = cryptoUtils.getRandomBytes(32);
			jest.spyOn(regularMerkleTree, 'calculateRootFromRightWitness').mockReturnValue(expected);
			const witness = [cryptoUtils.getRandomBytes(32)];
			await channelDataStore.updatePartnerChainOutboxRoot(context, chainID, witness);

			const updated = await channelDataStore.get(context, chainID);
			expect(updated.partnerChainOutboxRoot).toEqual(expected);

			expect(regularMerkleTree.calculateRootFromRightWitness).toHaveBeenCalledWith(
				mockChannelData.inbox.size,
				mockChannelData.inbox.appendPath,
				witness,
			);
		});
	});
});
