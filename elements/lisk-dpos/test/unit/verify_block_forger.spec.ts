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

import { Slots } from '@liskhq/lisk-chain';
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { Dpos } from '../../src';
import { EPOCH_TIME, BLOCK_TIME } from '../fixtures/constants';
import { delegatePublicKeys } from '../utils/round_delegates';
import { BlockHeader } from '../../src/types';
import { CONSENSUS_STATE_FORGERS_LIST_KEY } from '../../src/constants';

describe('dpos.verifyBlockForger()', () => {
	let dpos: Dpos;
	let chainStub: any;

	beforeEach(() => {
		// Arrange
		chainStub = {
			slots: new Slots({ epochTime: EPOCH_TIME, interval: BLOCK_TIME }) as any,
			dataAccess: {
				getConsensusState: jest.fn().mockResolvedValue(
					JSON.stringify([
						{
							round: 3,
							delegates: delegatePublicKeys.map(pk =>
								getAddressFromPublicKey(pk),
							),
						},
					]),
				),
			},
		};

		dpos = new Dpos({
			chain: chainStub,
		});
	});

	it('should resolve with "true" when block is forged by correct delegate', async () => {
		// Arrange
		const block = {
			height: 302,
			timestamp: 23450,
			generatorPublicKey:
				'c61d0822bbdbfe2a0b5503daff0ce8441c623115c94c0cfcf047a51f8b7160d3',
		} as BlockHeader;

		// Act
		const result = await dpos.verifyBlockForger(block);

		// Assert
		expect(result).toBe(true);
	});

	it('should call the chain state to get the list', async () => {
		// Arrange
		chainStub.dataAccess.getConsensusState.mockResolvedValue(
			JSON.stringify([
				{
					round: 1,
					delegates: delegatePublicKeys.map(pk => getAddressFromPublicKey(pk)),
				},
			]),
		);
		const block = {
			height: 99,
			timestamp: 23450,
			generatorPublicKey:
				'c61d0822bbdbfe2a0b5503daff0ce8441c623115c94c0cfcf047a51f8b7160d3',
		} as BlockHeader;

		// Act
		await dpos.verifyBlockForger(block);

		// Assert
		expect(chainStub.dataAccess.getConsensusState).toHaveBeenCalledWith(
			CONSENSUS_STATE_FORGERS_LIST_KEY,
		);
	});

	it('should throw error if block is forged by incorrect delegate', async () => {
		// Arrange
		const block = {
			height: 302,
			timestamp: 23450,
			generatorPublicKey:
				'cb1c9786f1af7a11c0ef79afd9173b91b8dc2b6c3fae1bc4dbad65253af26abc',
		} as BlockHeader;

		const expectedSlot = (dpos as any).chain.slots.getSlotNumber(
			block.timestamp,
		);

		// Act && Assert
		const error = new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`Failed to verify slot: ${expectedSlot}. Block ID: ${block.id}. Block Height: ${block.height}`,
		);
		await expect(dpos.verifyBlockForger(block)).rejects.toEqual(error);
	});

	it('should throw error if no delegate list is found', async () => {
		// Arrange
		chainStub.dataAccess.getConsensusState.mockResolvedValue(undefined);
		const block = {
			id: '1234',
			height: 302,
			timestamp: 23450,
			reward: BigInt('500000000'),
			totalFee: BigInt('10000000'),
			generatorPublicKey: 'xxx',
		} as BlockHeader;

		const expectedRound = dpos.rounds.calcRound(block.height);

		// Act && Assert
		const error = new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`No delegate list found for round: ${expectedRound}`,
		);
		await expect(dpos.verifyBlockForger(block)).rejects.toEqual(error);
	});
});
