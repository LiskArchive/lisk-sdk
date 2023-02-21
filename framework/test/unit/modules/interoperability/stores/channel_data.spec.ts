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
import {
	HASH_LENGTH,
	MIN_RETURN_FEE_PER_BYTE_LSK,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../src/modules/interoperability/constants';
import { ChannelDataStore } from '../../../../../src/modules/interoperability/stores/channel_data';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { InMemoryPrefixedStateDB } from '../../../../../src/testing/in_memory_prefixed_state';
import { createStoreGetter } from '../../../../../src/testing/utils';

describe('ChannelDataStore', () => {
	let context: StoreGetter;
	let channelDataStore: ChannelDataStore;

	const chainID = Buffer.from([0, 0, 0, 0]);
	const channelData = {
		inbox: {
			appendPath: [cryptoUtils.getRandomBytes(HASH_LENGTH)],
			root: cryptoUtils.getRandomBytes(HASH_LENGTH),
			size: 1,
		},
		messageFeeTokenID: cryptoUtils.getRandomBytes(8),
		outbox: {
			appendPath: [cryptoUtils.getRandomBytes(HASH_LENGTH)],
			root: cryptoUtils.getRandomBytes(HASH_LENGTH),
			size: 1,
		},
		partnerChainOutboxRoot: cryptoUtils.getRandomBytes(HASH_LENGTH),
		minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_LSK,
	};

	beforeEach(async () => {
		context = createStoreGetter(new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()));
		channelDataStore = new ChannelDataStore(MODULE_NAME_INTEROPERABILITY);
		await channelDataStore.set(context, chainID, channelData);
	});

	describe('updatePartnerChainOutboxRoot', () => {
		it('should update the partnerChainOutboxRoot with result of calculateRootFromRightWitness', async () => {
			const expectedOutboxRoot = cryptoUtils.getRandomBytes(HASH_LENGTH);
			jest
				.spyOn(regularMerkleTree, 'calculateRootFromRightWitness')
				.mockReturnValue(expectedOutboxRoot);
			const messageWitnessHashes = [cryptoUtils.getRandomBytes(HASH_LENGTH)];
			await channelDataStore.updatePartnerChainOutboxRoot(context, chainID, messageWitnessHashes);

			const updatedChannelData = await channelDataStore.get(context, chainID);
			expect(updatedChannelData.partnerChainOutboxRoot).toEqual(expectedOutboxRoot);

			expect(regularMerkleTree.calculateRootFromRightWitness).toHaveBeenCalledWith(
				channelData.inbox.size,
				channelData.inbox.appendPath,
				messageWitnessHashes,
			);
		});
	});
});
