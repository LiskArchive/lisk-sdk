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

import {
	CCMsg,
	Certificate,
	testing,
	cryptography,
	BlockHeader,
	tree,
	ChannelData,
} from 'lisk-sdk';
import { CCU_TOTAL_CCM_SIZE } from '../../src/constants';
import { CCMsFromEvents } from '../../src/types';
import { calculateMessageWitnesses } from '../../src/inbox_update';
import { getSampleCCM } from '../utils/sampleCCM';

describe('inboxUpdate', () => {
	let sampleBlock: BlockHeader;
	let sampleCertificate: Certificate;

	let sampleCCMs: CCMsg[];
	let sampleCCMFromEvents: CCMsFromEvents[];

	beforeEach(() => {
		sampleBlock = testing.createFakeBlockHeader({
			stateRoot: cryptography.utils.getRandomBytes(32),
			validatorsHash: cryptography.utils.getRandomBytes(32),
			height: 100,
		}) as BlockHeader & { validatorsHash: Buffer; stateRoot: Buffer };

		sampleCertificate = {
			blockID: sampleBlock.id,
			height: sampleBlock.height,
			timestamp: sampleBlock.timestamp,
			validatorsHash: sampleBlock.validatorsHash as Buffer,
			stateRoot: sampleBlock.stateRoot as Buffer,
			aggregationBits: Buffer.alloc(0),
			signature: cryptography.utils.getRandomBytes(32),
		};

		sampleCCMs = new Array(4).fill(0).map((_, index) => getSampleCCM(index + 1));

		sampleCCMFromEvents = [
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
		const channelData: ChannelData = {
			inbox: {
				size: 2,
				appendPath: [],
				root: Buffer.alloc(1),
			},
			outbox: {
				size: 2,
				appendPath: [],
				root: Buffer.alloc(1),
			},
			messageFeeTokenID: Buffer.from('04000001', 'hex'),
			partnerChainOutboxRoot: Buffer.alloc(2),
		};
		it('should return one inboxUpdate when all the ccms can be included', async () => {
			jest.spyOn(tree.regularMerkleTree, 'calculateRightWitness').mockReturnValue([]);
			const inboxUpdate = calculateMessageWitnesses(
				channelData,
				sampleCCMFromEvents,
				{ height: 1, nonce: BigInt(0) },
				CCU_TOTAL_CCM_SIZE,
			);

			// Message witness is empty when all the CCMs are included
			expect(inboxUpdate.messageWitnessHashes).toEqual([]);
			expect(tree.regularMerkleTree.calculateRightWitness).not.toHaveBeenCalled();
		});

		it('should return multiple inboxUpdates when all the ccms cannot be included in one', async () => {
			jest
				.spyOn(tree.regularMerkleTree, 'calculateRightWitness')
				.mockReturnValue([Buffer.alloc(1)]);
			const ccmListWithBigSize = [
				...sampleCCMFromEvents,
				{
					ccms: [getSampleCCM(5, 8000), getSampleCCM(6, 8000)],
					height: 60,
					inclusionProof: {
						bitmap: Buffer.alloc(1),
						siblingHashes: [Buffer.from('01')],
					},
				},
			];

			const inboxUpdate = calculateMessageWitnesses(
				channelData,
				ccmListWithBigSize,
				{ height: 1, nonce: BigInt(0) },
				CCU_TOTAL_CCM_SIZE,
			);

			// First inboxUpdate should have non-empty outboxRootWitness
			expect(inboxUpdate.messageWitnessHashes).toEqual([Buffer.alloc(1)]);
			expect(tree.regularMerkleTree.calculateRightWitness).toHaveBeenCalledTimes(1);
		});

		it('should return empty inboxUpdate when there is no ccm after filter', async () => {
			jest
				.spyOn(tree.regularMerkleTree, 'calculateRightWitness')
				.mockReturnValue([Buffer.alloc(1)]);
			const { crossChainMessages, lastCCMToBeSent, messageWitnessHashes } =
				calculateMessageWitnesses(
					channelData,
					[],
					{ height: sampleCertificate.height + 1, nonce: BigInt(2) },
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
