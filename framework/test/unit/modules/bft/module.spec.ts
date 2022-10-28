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

import { Slots, StateStore } from '@liskhq/lisk-chain';
import { InMemoryDatabase } from '@liskhq/lisk-db';
import { BFTModule } from '../../../../src/engine/bft';
import {
	EMPTY_KEY,
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_VOTES,
} from '../../../../src/engine/bft/constants';
import { bftVotesSchema } from '../../../../src/engine/bft/schemas';
import { createFakeBlockHeader } from '../../../../src/testing';

describe('bft module', () => {
	let bftModule: BFTModule;

	beforeEach(() => {
		bftModule = new BFTModule();
	});

	describe('init', () => {
		it('should initialize config with given value', async () => {
			await expect(
				bftModule.init(20, new Slots({ genesisBlockTimestamp: 0, interval: 10 })),
			).toResolve();

			expect(bftModule['_batchSize']).toEqual(20);
		});
	});

	describe('initGenesisState', () => {
		it('should initialize vote store', async () => {
			const stateStore = new StateStore(new InMemoryDatabase());
			const genesisHeight = 20;

			await bftModule.initGenesisState(
				stateStore,
				createFakeBlockHeader({ height: genesisHeight }),
			);

			const votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);

			await expect(votesStore.has(EMPTY_KEY)).resolves.toBeTrue();
			await expect(votesStore.getWithSchema(EMPTY_KEY, bftVotesSchema)).resolves.toEqual({
				maxHeightPrevoted: genesisHeight,
				maxHeightPrecommitted: genesisHeight,
				maxHeightCertified: genesisHeight,
				blockBFTInfos: [],
				activeValidatorsVoteInfo: [],
			});
		});
	});
});
