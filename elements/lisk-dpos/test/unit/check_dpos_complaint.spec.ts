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
import { Slots } from '@liskhq/lisk-chain';
import { Dpos } from '../../src';
import {
	DELEGATE_LIST_ROUND_OFFSET,
	ACTIVE_DELEGATES,
	BLOCK_TIME,
} from '../fixtures/constants';
import {
	StateStoreMock,
	AdditionalInformation,
} from '../utils/state_store_mock';
import { BlockHeader } from '../../src/types';
import { blockHeaders } from '../utils/block_headers';
import * as delegateAddresses from '../fixtures/delegate_addresses.json';

const MS_IN_A_SEC = 1000;
const GENESIS_BLOCK_TIMESTAMP =
	new Date(Date.UTC(2020, 5, 15, 0, 0, 0, 0)).getTime() / MS_IN_A_SEC;

const createStateStore = (
	additionalInfo: AdditionalInformation,
): StateStoreMock => {
	return new StateStoreMock([], undefined, additionalInfo);
};

describe('dpos.isDPoSProtocolCompliant()', () => {
	let dpos: Dpos;
	const delegateListRoundOffset = DELEGATE_LIST_ROUND_OFFSET;
	const generatorPublicKey = Buffer.from(
		'b4f98dacb1609ad11b63ea20b61a5721a9b502af948c96522260e3d89910a8d9',
		'hex',
	);

	beforeEach(() => {
		// Arrange
		const slots = new Slots({
			genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
			interval: BLOCK_TIME,
		});
		const chain = {
			slots,
		};
		const initDelegates = delegateAddresses.map(addr =>
			Buffer.from(addr, 'base64'),
		);

		dpos = new Dpos({
			chain: chain as any,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset,
			initDelegates,
			genesisBlockHeight: 0,
			initRound: 3,
		});
	});

	describe('Given delegate was only active in last three rounds', () => {
		it('should return false if current block seedReveal is not a preimage of previous block', async () => {
			// Arrange
			const blockHeader = {
				asset: {
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
				},
				height: 5,
				generatorPublicKey,
			} as BlockHeader;

			// Act
			const isDPoSProtocolCompliant = await dpos.isDPoSProtocolCompliant(
				blockHeader,
				createStateStore({ lastBlockHeaders: blockHeaders as BlockHeader[] }),
			);
			// Assert
			expect(isDPoSProtocolCompliant).toBeFalse();
		});

		it('should return true if current block seedReveal is a preimage of previous block', async () => {
			// Arrange
			const lastBlockHeaders = [...blockHeaders.slice(1)] as BlockHeader[];
			const blockHeader = {
				asset: {
					seedReveal: blockHeaders[0].asset.seedReveal,
				},
				height: 5,
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
			const lastBlockHeaders = [...blockHeaders.slice(1)] as BlockHeader[];
			const blockHeader = {
				asset: {
					seedReveal: blockHeaders[0].asset.seedReveal,
				},
				height: 404,
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

		it('should return false if the forger did forge a block in the previous round or previously in the same round but new block with wrong seed reveal', async () => {
			// Arrange
			const lastBlockHeaders = blockHeaders as BlockHeader[];
			const blockHeader = {
				asset: {
					seedReveal: Buffer.from('00000000000000000000000000000000', 'hex'),
				},
				height: 202,
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
	});
});
