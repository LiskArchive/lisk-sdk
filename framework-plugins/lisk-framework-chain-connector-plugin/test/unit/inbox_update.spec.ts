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
	codec,
	ccmSchema,
	Certificate,
	testing,
	cryptography,
	BlockHeader,
	LastCertificate,
	db,
	tree,
	EMPTY_BYTES,
} from 'lisk-sdk';
import { CCU_TOTAL_CCM_SIZE } from '../../src/constants';
import * as inboxUpdateUtil from '../../src/inbox_update';
import { CCMsFromEvents } from '../../src/types';
import { calculateInboxUpdate } from '../../src/inbox_update';
import { getSampleCCM } from '../utils/sampleCCM';

describe('inboxUpdate', () => {
	describe('calculateInboxUpdate', () => {
		const sampleBlock = testing.createFakeBlockHeader({
			stateRoot: cryptography.utils.getRandomBytes(32),
			validatorsHash: cryptography.utils.getRandomBytes(32),
			height: 100,
		}) as BlockHeader & { validatorsHash: Buffer; stateRoot: Buffer };

		const sampleCertificate: Certificate = {
			blockID: sampleBlock.id,
			height: sampleBlock.height,
			timestamp: sampleBlock.timestamp,
			validatorsHash: sampleBlock.validatorsHash,
			stateRoot: sampleBlock.stateRoot,
			aggregationBits: Buffer.alloc(0),
			signature: cryptography.utils.getRandomBytes(32),
		};

		const sampleLastCertificate: LastCertificate = {
			height: sampleCertificate.height - 50,
			stateRoot: cryptography.utils.getRandomBytes(32),
			validatorsHash: cryptography.utils.getRandomBytes(32),
			timestamp: Date.now(),
		};

		const sampleCCMs = new Array(4).fill(0).map((_, index) => getSampleCCM(index + 1));
		const sampleCCMFromEvents: CCMsFromEvents[] = [
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

		let chainConnectorDB: db.Database;
		let appendMock: jest.SpyInstance;
		let generateRightWitnessMock: jest.SpyInstance;

		beforeEach(() => {
			chainConnectorDB = new db.InMemoryDatabase() as unknown as db.Database;
			appendMock = jest.spyOn(tree.MerkleTree.prototype, 'append').mockImplementation();
			generateRightWitnessMock = jest
				.spyOn(tree.MerkleTree.prototype, 'generateRightWitness')
				.mockImplementation();
		});

		it('should return one inboxUpdate when all the ccms can be included', async () => {
			const inboxUpdates = await calculateInboxUpdate(
				sampleCertificate,
				sampleLastCertificate,
				sampleCCMFromEvents,
				chainConnectorDB,
			);
			expect(inboxUpdates).toHaveLength(1);

			expect(inboxUpdates[0].outboxRootWitness.bitmap).toEqual(Buffer.alloc(1));
			expect(inboxUpdates[0].outboxRootWitness.siblingHashes).toEqual([Buffer.alloc(1)]);
			// Message witness is empty when all the CCMs are included
			expect(inboxUpdates[0].messageWitnessHashes).toEqual([]);
			expect(appendMock).not.toHaveBeenCalled();
			expect(generateRightWitnessMock).not.toHaveBeenCalled();
		});

		it('should return multiple inboxUpdates when all the ccms cannot be included in one', async () => {
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
			generateRightWitnessMock.mockResolvedValue([Buffer.alloc(1)]);
			const inboxUpdates = await calculateInboxUpdate(
				sampleCertificate,
				sampleLastCertificate,
				ccmListWithBigSize,
				chainConnectorDB,
			);

			expect(inboxUpdates).toHaveLength(2);

			// First inboxUpdate should have non-empty outboxRootWitness
			expect(inboxUpdates[0].outboxRootWitness.bitmap).toEqual(Buffer.alloc(1));
			expect(inboxUpdates[0].outboxRootWitness.siblingHashes).toEqual([Buffer.from('01')]);
			expect(inboxUpdates[0].messageWitnessHashes).toEqual([Buffer.alloc(1)]);

			// Second inboxUpdate should have empty outboxRootWitness
			expect(inboxUpdates[1].outboxRootWitness.bitmap).toEqual(EMPTY_BYTES);
			expect(inboxUpdates[1].outboxRootWitness.siblingHashes).toEqual([]);
			expect(inboxUpdates[0].messageWitnessHashes).toEqual([Buffer.alloc(1)]);
			expect(appendMock).toHaveBeenCalledTimes(4);
			expect(generateRightWitnessMock).toHaveBeenCalledTimes(2);
		});
	});

	// TODO: Break it down into multiple cases where we have 1 group and multiple group depending on ccms size.
	describe('_groupCCMsBySize', () => {
		it('should return CCMsFromEvents[][] with length of total CCMs divided by CCU_TOTAL_CCM_SIZE', () => {
			const ccmsFromEvents: CCMsFromEvents[] = [];
			const buildNumCCMs = (num: number, fromHeight: number): CCMsg[] => {
				const ccms: CCMsg[] = [];
				let j = 1;
				while (j <= num) {
					ccms.push(getSampleCCM(fromHeight + j, 1000));
					j += 1;
				}
				return ccms;
			};

			ccmsFromEvents.push({
				height: 1,
				ccms: buildNumCCMs(2, 1),
				inclusionProof: {} as any,
			});
			ccmsFromEvents.push({
				height: 3,
				ccms: buildNumCCMs(5, 3),
				inclusionProof: {} as any,
			});
			ccmsFromEvents.push({
				height: 4,
				ccms: buildNumCCMs(20, 4),
				inclusionProof: {} as any,
			});

			const listOfCCMs = inboxUpdateUtil.groupCCMsBySize(ccmsFromEvents);

			const getTotalSize = (ccms: CCMsg[]) => {
				return ccms
					.map(ccm => codec.encode(ccmSchema, ccm).length) // to each CCM size
					.reduce((a, b) => a + b, 0); // sum
			};

			// for 25 CCMs (after filtering), we will have 3 lists
			expect(listOfCCMs).toHaveLength(3);

			// Ist list will have 9 CCMs (start index 0, last index = 8), totalSize = 9531 (1059 * 9))
			const firstList = listOfCCMs[0];
			expect(firstList).toHaveLength(9);
			expect(getTotalSize(firstList)).toBeLessThan(CCU_TOTAL_CCM_SIZE);

			// 2nd list will have 9 CCMs (start index 9, last index = 17)
			const secondList = listOfCCMs[1];
			expect(secondList).toHaveLength(9);
			expect(getTotalSize(secondList)).toBeLessThan(CCU_TOTAL_CCM_SIZE);

			// 3rd list will have 7 CCMs (start index 18)
			const thirdList = listOfCCMs[2];
			expect(thirdList).toHaveLength(9);
		});
	});
});
