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
import { codec } from '@liskhq/lisk-codec';
import { forgerListSchema } from '../../src/schemas';
import { Dpos } from '../../src';
import { BLOCK_TIME } from '../fixtures/constants';
import { delegatePublicKeys } from '../utils/round_delegates';
import { BlockHeader } from '../../src/types';
import { CONSENSUS_STATE_DELEGATE_FORGERS_LIST } from '../../src/constants';

describe('dpos.verifyBlockForger()', () => {
	let dpos: Dpos;
	let chainStub: any;

	beforeEach(() => {
		// Arrange
		const forgerListObject = {
			forgersList: [
				{
					round: 3,
					delegates: delegatePublicKeys.map(pk =>
						getAddressFromPublicKey(Buffer.from(pk, 'hex')),
					),
					standby: [],
				},
			],
		};

		const forgersList = codec.encode(forgerListSchema, forgerListObject);

		chainStub = {
			slots: new Slots({ interval: BLOCK_TIME }) as any,
			dataAccess: {
				getConsensusState: jest.fn().mockResolvedValue(forgersList),
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
			generatorPublicKey: Buffer.from(
				'c61d0822bbdbfe2a0b5503daff0ce8441c623115c94c0cfcf047a51f8b7160d3',
				'hex',
			),
		} as BlockHeader;

		// Act
		const result = await dpos.verifyBlockForger(block);

		// Assert
		expect(result).toBe(true);
	});

	it('should call the chain state to get the list', async () => {
		// Arrange
		const forgerListObject = {
			forgersList: [
				{
					round: 1,
					delegates: delegatePublicKeys.map(pk =>
						getAddressFromPublicKey(Buffer.from(pk, 'hex')),
					),
					standby: [],
				},
			],
		};

		const forgersList = codec.encode(forgerListSchema, forgerListObject);

		chainStub.dataAccess.getConsensusState.mockResolvedValue(forgersList);
		const block = {
			height: 99,
			timestamp: 23450,
			generatorPublicKey: Buffer.from(
				'c61d0822bbdbfe2a0b5503daff0ce8441c623115c94c0cfcf047a51f8b7160d3',
				'hex',
			),
		} as BlockHeader;

		// Act
		await dpos.verifyBlockForger(block);

		// Assert
		expect(chainStub.dataAccess.getConsensusState).toHaveBeenCalledWith(
			CONSENSUS_STATE_DELEGATE_FORGERS_LIST,
		);
	});

	it('should throw error if block is forged by incorrect delegate', async () => {
		// Arrange
		const block = {
			height: 302,
			timestamp: 23450,
			generatorPublicKey: Buffer.from(
				'cb1c9786f1af7a11c0ef79afd9173b91b8dc2b6c3fae1bc4dbad65253af26abc',
				'hex',
			),
		} as BlockHeader;

		const expectedSlot = (dpos as any).chain.slots.getSlotNumber(
			block.timestamp,
		);

		// Act && Assert
		const error = new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`Failed to verify slot: ${expectedSlot}. Block Height: ${block.height}`,
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
		};

		const expectedRound = dpos.rounds.calcRound(block.height);

		// Act && Assert
		const error = new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`No delegate list found for round: ${expectedRound}`,
		);
		await expect(dpos.verifyBlockForger(block as any)).rejects.toEqual(error);
	});
});
