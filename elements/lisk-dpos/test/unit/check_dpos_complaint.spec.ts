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

import { Dpos } from '../../src';
import { Slots } from '@liskhq/lisk-chain';
import {
	DELEGATE_LIST_ROUND_OFFSET,
	ACTIVE_DELEGATES,
	EPOCH_TIME,
	BLOCK_TIME,
} from '../fixtures/constants';
import {
	StateStoreMock,
	AdditionalInformation,
} from '../utils/state_store_mock';
import { BlockHeader } from '../../src/types';
import { blockHeaders } from '../utils/block_headers';

const createStateStore = (additionalInfo: AdditionalInformation) => {
	return new StateStoreMock([], undefined, additionalInfo);
};

const lastBlockHeaders = blockHeaders.sort(
	(a, b) => b.height - a.height,
) as BlockHeader[];

const getForgerBlocks = (publicKey: string) =>
	lastBlockHeaders.filter(b => b.generatorPublicKey === publicKey);

describe('dpos.isDPoSProtocolCompliant()', () => {
	let dpos: Dpos;
	const delegateListRoundOffset = DELEGATE_LIST_ROUND_OFFSET;
	const generatorPublicKey =
		'70cfea0529643e8cf55750f8523b1e228a3db6ab38f3eacb16988dcbfc5f0a44';

	beforeEach(() => {
		// Arrange
		const slots = new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME });
		const chain = {
			slots,
		};

		dpos = new Dpos({
			chain: chain as any,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset,
		});
	});

	describe('Given delegate was only active in last three rounds', () => {
		it('should return false if current block seedReveal is not a preimage of previous block', async () => {
			// Arrange
			const [lastBlock] = getForgerBlocks(generatorPublicKey).slice(0, 1);
			const blockHeader = {
				height: lastBlock.height + 1,
				seedReveal: '00000000000000000000000000000000',
				generatorPublicKey,
			} as BlockHeader;

			// Act
			const isDPoSProtocolCompliant = await dpos.isDPoSProtocolCompliant(
				blockHeader,
				createStateStore({ lastBlockHeaders }),
			);
			// Assert
			expect(isDPoSProtocolCompliant).toBeFalse();
		});

		it('should return true if current block seedReveal is a preimage of previous block', async () => {
			// Arrange
			const [lastBlock] = getForgerBlocks(generatorPublicKey).slice(0, 1);
			const blockHeader = {
				height: lastBlock.height + 1,
				seedReveal: 'df927cd14e84660c0a82c5f33a6f26f7',
				generatorPublicKey,
			} as BlockHeader;

			// Act
			const isDPoSProtocolCompliant = await dpos.isDPoSProtocolCompliant(
				blockHeader,
				createStateStore({ lastBlockHeaders }),
			);
			// Assert
			expect(isDPoSProtocolCompliant).toBeTrue();
		});
	});

	describe('Given delegate was not active in last rounds', () => {
		it('should return true if the forger did not forge any block in the previous round or previously in the same round', async () => {
			// Arrange
			const forgingMissedRoundBlockHeaders = [...lastBlockHeaders].filter(
				d => d.generatorPublicKey !== generatorPublicKey,
			);

			const blockHeader = {
				height: 400,
				seedReveal: 'df927cd14e84660c0a82c5f33a6f26f7',
				generatorPublicKey,
			} as BlockHeader;

			// Act
			const isDPoSProtocolCompliant = await dpos.isDPoSProtocolCompliant(
				blockHeader,
				createStateStore({ lastBlockHeaders: forgingMissedRoundBlockHeaders }),
			);
			// Assert
			expect(isDPoSProtocolCompliant).toBeTrue();
		});
	});
});
