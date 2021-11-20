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
import { InMemoryKVStore } from '@liskhq/lisk-db';
import { testing } from '../../../../src';
import { BFTModule } from '../../../../src/modules/bft';
import { EMPTY_KEY, STORE_PREFIX_BFT_VOTES } from '../../../../src/modules/bft/constants';
import { bftVotesSchema } from '../../../../src/modules/bft/schemas';
import { createFakeBlockHeader } from '../../../../src/testing';

describe('bft module', () => {
	let bftModule: BFTModule;

	beforeEach(() => {
		bftModule = new BFTModule();
	});

	describe('afterGenesisBlockExecute', () => {
		it('should initialize vote store', async () => {
			const stateStore = new StateStore(new InMemoryKVStore());
			const genesisHeight = 20;
			const context = testing.createGenesisBlockContext({
				header: createFakeBlockHeader({ height: genesisHeight }),
				stateStore,
			});

			await bftModule.afterGenesisBlockExecute(context.createGenesisBlockExecuteContext());

			const voteStore = stateStore.getStore(bftModule.id, STORE_PREFIX_BFT_VOTES);

			await expect(voteStore.has(EMPTY_KEY)).resolves.toBeTrue();
			await expect(voteStore.getWithSchema(EMPTY_KEY, bftVotesSchema)).resolves.toEqual({
				maxHeightPrevoted: genesisHeight,
				maxHeightPrecommitted: genesisHeight,
				maxHeightCertified: genesisHeight,
				blockBFTInfos: [],
				activeValidatorsVoteInfo: [],
			});
		});
	});
});
