/*
 * Copyright © 2019 Lisk Foundation
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
	EPOCH_TIME,
	BLOCK_TIME,
	ACTIVE_DELEGATES,
	DELEGATE_LIST_ROUND_OFFSET,
} from '../fixtures/constants';
import { delegatePublicKeys } from '../utils/round_delegates';
import { BlockHeader } from '../../src/types';
import { CHAIN_STATE_FORGERS_LIST_KEY } from '../../src/constants';

describe('dpos.verifyBlockForger()', () => {
	let dpos: Dpos;
	let chainStub: any;

	beforeEach(() => {
		// Arrange
		chainStub = {
			slots: new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME }) as any,
			dataAccess: {
				getChainState: jest
					.fn()
					.mockResolvedValue(
						JSON.stringify([{ round: 3, delegates: delegatePublicKeys }]),
					),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
			activeDelegates: ACTIVE_DELEGATES,
			delegateListRoundOffset: DELEGATE_LIST_ROUND_OFFSET,
		});
	});

	it('should resolve with "true" when block is forged by correct delegate', async () => {
		// Arrange
		const block = {
			height: 302,
			timestamp: 23450,
			generatorPublicKey:
				'6fb2e0882cd9d895e1e441b9f9be7f98e877aa0a16ae230ee5caceb7a1b896ae',
		} as BlockHeader;

		// Act
		const result = await dpos.verifyBlockForger(block);

		// Assert
		expect(result).toBe(true);
	});

	it('should call the chain state to get the list', async () => {
		// Arrange
		chainStub.dataAccess.getChainState.mockResolvedValue(
			JSON.stringify([{ round: 1, delegates: delegatePublicKeys }]),
		);
		const block = {
			height: 99,
			timestamp: 23450,
			generatorPublicKey:
				'b5341e839b25c4cc2aaf421704c0fb6ba987d537678e23e45d3ca32454a2908c',
		} as BlockHeader;

		// Act
		await dpos.verifyBlockForger(block);

		// Assert
		expect(chainStub.dataAccess.getChainState).toHaveBeenCalledWith(
			CHAIN_STATE_FORGERS_LIST_KEY,
		);
	});

	it('should throw error if block is forged by incorrect delegate', async () => {
		// Arrange
		const block = {
			height: 302,
			timestamp: 23450,
			generatorPublicKey: 'xxx',
		} as BlockHeader;

		const expectedSlot = (dpos as any).chain.slots.getSlotNumber(
			block.timestamp,
		);

		// Act && Assert
		const error = new Error(
			`Failed to verify slot: ${expectedSlot}. Block ID: ${block.id}. Block Height: ${block.height}`,
		);
		await expect(dpos.verifyBlockForger(block)).rejects.toEqual(error);
	});

	it('should throw error if no delegate list is found', async () => {
		// Arrange
		chainStub.dataAccess.getChainState.mockResolvedValue(undefined);
		const block = {
			id: 1234,
			height: 302,
			timestamp: 23450,
			generatorPublicKey: 'xxx',
		} as BlockHeader;

		const expectedRound = dpos.rounds.calcRound(block.height);

		// Act && Assert
		const error = new Error(
			`No delegate list found for round: ${expectedRound}`,
		);
		await expect(dpos.verifyBlockForger(block)).rejects.toEqual(error);
	});
});
