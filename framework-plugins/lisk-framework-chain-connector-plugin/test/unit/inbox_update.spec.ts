/*
 * Copyright © 2022 Lisk Foundation
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

import { CCMsg, tree } from 'lisk-sdk';
import { CCU_TOTAL_CCM_SIZE } from '../../src/constants';
import { CCMsFromEvents } from '../../src/types';
import { calculateMessageWitnesses } from '../../src/inbox_update';
import { getSampleCCM } from '../utils/sampleCCM';

describe('inboxUpdate', () => {
	let sampleCCMs: CCMsg[];
	let sampleCCMsFromEvents: CCMsFromEvents[];

	beforeEach(() => {
		sampleCCMs = new Array(4).fill(0).map((_, index) => getSampleCCM(index + 1));

		sampleCCMsFromEvents = [
			{
				ccms: sampleCCMs.slice(0, 1),
				height: 60,
				inclusionProof: {
					bitmap: Buffer.alloc(1),
					siblingHashes: [],
				},
			},
			{
				ccms: sampleCCMs.slice(2, 3),
				height: 64,
				inclusionProof: {
					bitmap: Buffer.alloc(1),
					siblingHashes: [Buffer.alloc(1)],
				},
			},
		];
	});

	describe('calculateMessageWitnesses', () => {
		it('should return one inboxUpdate when all the ccms can be included', () => {
			jest.spyOn(tree.regularMerkleTree, 'calculateRightWitness').mockReturnValue([]);
			const messageWitnessHashesForCCMs = calculateMessageWitnesses(
				0,
				1,
				{
					height: 1,
					nonce: BigInt(0),
				},
				sampleCCMsFromEvents,
				CCU_TOTAL_CCM_SIZE,
			);

			// Message witness is empty when all the CCMs are included
			expect(messageWitnessHashesForCCMs.messageWitnessHashes).toEqual([]);
			expect(tree.regularMerkleTree.calculateRightWitness).not.toHaveBeenCalled();
		});

		it('should return multiple inboxUpdates when all the ccms cannot be included in one', () => {
			jest
				.spyOn(tree.regularMerkleTree, 'calculateRightWitness')
				.mockReturnValue([Buffer.alloc(1)]);
			const ccmListWithBigSize = [
				...sampleCCMsFromEvents,
				{
					ccms: [getSampleCCM(5, 8000), getSampleCCM(6, 8000)],
					height: 60,
					inclusionProof: {
						bitmap: Buffer.alloc(1),
						siblingHashes: [Buffer.from('01')],
					},
				},
			];

			const messageWitnessHashesForCCMs = calculateMessageWitnesses(
				0,
				1,
				{
					height: 1,
					nonce: BigInt(0),
				},
				ccmListWithBigSize,
				CCU_TOTAL_CCM_SIZE,
			);

			// First inboxUpdate should have non-empty outboxRootWitness
			expect(messageWitnessHashesForCCMs.messageWitnessHashes).toEqual([Buffer.alloc(1)]);
			expect(tree.regularMerkleTree.calculateRightWitness).toHaveBeenCalledTimes(1);
		});

		it('should return empty inboxUpdate when there is no ccm after filter', () => {
			jest
				.spyOn(tree.regularMerkleTree, 'calculateRightWitness')
				.mockReturnValue([Buffer.alloc(1)]);
			const { crossChainMessages, lastCCMToBeSent, messageWitnessHashes } =
				calculateMessageWitnesses(
					0,
					1,
					{
						height: 1,
						nonce: BigInt(0),
					},
					[],
					CCU_TOTAL_CCM_SIZE,
				);

			// First inboxUpdate should have non-empty outboxRootWitness
			expect(crossChainMessages).toHaveLength(0);
			expect(messageWitnessHashes).toHaveLength(0);
			expect(lastCCMToBeSent).toBeUndefined();

			expect(tree.regularMerkleTree.calculateRightWitness).not.toHaveBeenCalled();
		});
	});
});
