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
	BFTHeights,
	chain,
	computeUnsignedCertificateFromBlockHeader,
	cryptography,
	testing,
} from 'lisk-sdk';
import {
	checkChainOfTrust,
	getCertificateFromAggregateCommit,
	getNextCertificateFromAggregateCommits,
} from '../../src/certificate_generation';
import { ADDRESS_LENGTH, BLS_PUBLIC_KEY_LENGTH, HASH_LENGTH } from '../../src/constants';

describe('certificate generation', () => {
	const sampleSizeArray = new Array(10).fill(0);
	const lastValidatorsHash = cryptography.utils.getRandomBytes(32);
	const lastCertifiedBlock = testing
		.createFakeBlockHeader({
			height: 1,
			validatorsHash: lastValidatorsHash,
			aggregateCommit: {
				aggregationBits: cryptography.utils.getRandomBytes(32),
				certificateSignature: cryptography.utils.getRandomBytes(32),
				height: 1,
			},
		})
		.toObject();
	// Blockheaders from height 2 to 11
	const uncertifiedBlockHeaders = sampleSizeArray
		.map((_value, _index) => {
			// for every alternate height add aggregateCommit and for rest empty aggregateCommit
			if (_index % 2 === 0) {
				return testing.createFakeBlockHeader({
					height: _index + 2,
					aggregateCommit: {
						aggregationBits: Buffer.from('01', 'hex'),
						certificateSignature: cryptography.utils.getRandomBytes(32),
						height: _index + 2,
					},
				});
			}
			return testing.createFakeBlockHeader({ height: _index + 2 });
		})
		.map(b => b.toObject());

	const sampleBlockHeaders = [lastCertifiedBlock].concat(uncertifiedBlockHeaders);

	// aggregateCommits from the blockheaders
	const aggregateCommitsSample = sampleBlockHeaders.reduce((commits, b) => {
		if (!b.aggregateCommit.certificateSignature.equals(Buffer.alloc(0))) {
			commits.push(b.aggregateCommit as never);
		}

		return commits;
	}, []);

	const validatorsDataAtLastCertifiedheight = {
		certificateThreshold: BigInt(2),
		validators: [
			{
				address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
				bftWeight: BigInt(1),
				blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
			},
			{
				address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
				bftWeight: BigInt(1),
				blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
			},
		],
		validatorsHash: lastValidatorsHash,
	};

	const sampleValidatorsData = {
		certificateThreshold: BigInt(10),
		validators: [
			{
				address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
				bftWeight: BigInt(1),
				blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
			},
			{
				address: cryptography.utils.getRandomBytes(ADDRESS_LENGTH),
				bftWeight: BigInt(1),
				blsKey: cryptography.utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH),
			},
		],
		validatorsHash: cryptography.utils.getRandomBytes(HASH_LENGTH),
	};

	const bftHeights: BFTHeights = {
		maxHeightPrevoted: 5,
		maxHeightPrecommitted: 5,
		maxHeightCertified: 3,
	};

	const blsKeyToBFTWeight: Record<string, bigint> = {};
	blsKeyToBFTWeight[sampleValidatorsData.validators[1].blsKey.toString('hex')] = BigInt(2);

	describe('getCertificateFromAggregateCommit', () => {
		it('should throw error if block header is not found for the aggregateCommit height', () => {
			expect(() =>
				getCertificateFromAggregateCommit(aggregateCommitsSample[1], [sampleBlockHeaders[0]]),
			).toThrow('No block header found for the given aggregate height');
		});

		it('should compute Certificate from block header', () => {
			const firstBlockHeader = sampleBlockHeaders[0];
			const { aggregateCommit } = firstBlockHeader;

			const unsignedCertificate = computeUnsignedCertificateFromBlockHeader(
				new chain.BlockHeader(firstBlockHeader),
			);
			const expectedCertificate = {
				...unsignedCertificate,
				aggregationBits: aggregateCommit.aggregationBits,
				signature: aggregateCommit.certificateSignature,
			};

			const computedCertificate = getCertificateFromAggregateCommit(aggregateCommit, [
				firstBlockHeader,
			]);

			expect(computedCertificate).toEqual(expectedCertificate);
		});
	});

	describe('checkChainOfTrust', () => {
		it('should throw error when there is no block header at {aggregateCommit.height - 1}', () => {
			expect(() =>
				checkChainOfTrust(
					lastValidatorsHash,
					blsKeyToBFTWeight,
					validatorsDataAtLastCertifiedheight.certificateThreshold,
					aggregateCommitsSample[3],
					[lastCertifiedBlock],
					[validatorsDataAtLastCertifiedheight],
				),
			).toThrow('No block header found for the given aggregate height');
		});

		it('should throw error when there is no validatorsData at {aggregateCommit.height - 1}', () => {
			expect(() =>
				checkChainOfTrust(
					lastValidatorsHash,
					blsKeyToBFTWeight,
					validatorsDataAtLastCertifiedheight.certificateThreshold,
					aggregateCommitsSample[2],
					sampleBlockHeaders,
					[validatorsDataAtLastCertifiedheight],
				),
			).toThrow('No validators data found for the given validatorsHash');
		});

		it('should validate for valid lastValidatorsHash', () => {
			const valid = checkChainOfTrust(
				lastValidatorsHash,
				blsKeyToBFTWeight,
				validatorsDataAtLastCertifiedheight.certificateThreshold,
				aggregateCommitsSample[1],
				sampleBlockHeaders,
				[validatorsDataAtLastCertifiedheight],
			);
			expect(valid).toBe(true);
		});

		it('should return false when lastCertificateThreshold > { aggregateBFTWeight of the validators }', () => {
			const aggregateHeightAtThree = aggregateCommitsSample[2];
			const validatorsHashAtHeightThree = sampleBlockHeaders[2].validatorsHash;
			const validatorsDataAtHeightThree = {
				...sampleValidatorsData,
				validatorsHash: validatorsHashAtHeightThree,
			};

			/**
			 * Configuration:
			 * aggregate height = 4
			 * validatorsHash at height 3
			 * lastCertifiedHeight = 1
			 * aggregationBit = '01'
			 * lastCertificateThreshold = BigInt(3)
			 */
			const valid = checkChainOfTrust(
				lastCertifiedBlock.validatorsHash,
				blsKeyToBFTWeight,
				BigInt(3), // Last certificate threshold > aggregateBFT weight
				aggregateHeightAtThree,
				sampleBlockHeaders,
				[validatorsDataAtHeightThree],
			);
			expect(valid).toBe(false);
		});

		it('should validate for blockHeader at height 4', () => {
			const aggregateHeightAtFour = aggregateCommitsSample[2];
			const validatorsHashAtHeightThree = sampleBlockHeaders[2].validatorsHash;
			const validatorsDataAtHeightThree = {
				...sampleValidatorsData,
				validatorsHash: validatorsHashAtHeightThree,
			};

			/**
			 * Configuration:
			 * aggregate height = 4
			 * validatorsHash at height 3
			 * lastCertifiedHeight = 1
			 * aggregationBit = '01'
			 * lastCertificateThreshold = BigInt(1)
			 */
			const valid = checkChainOfTrust(
				lastCertifiedBlock.validatorsHash,
				blsKeyToBFTWeight,
				validatorsDataAtLastCertifiedheight.certificateThreshold,
				aggregateHeightAtFour,
				sampleBlockHeaders,
				[validatorsDataAtHeightThree],
			);
			expect(valid).toBe(true);
		});
	});

	describe('getNextCertificateFromAggregateCommits', () => {
		it('should throw error when no block header found at last certified height', () => {
			expect(() =>
				getNextCertificateFromAggregateCommits(
					[],
					aggregateCommitsSample,
					[sampleValidatorsData],
					bftHeights,
					{ height: lastCertifiedBlock.height } as any,
				),
			).toThrow('No block header found for the last certified height');
		});

		it('should throw error when no validators data found at last certified height', () => {
			expect(() =>
				getNextCertificateFromAggregateCommits(
					sampleBlockHeaders,
					aggregateCommitsSample,
					[],
					bftHeights,
					{ height: lastCertifiedBlock.height } as any,
				),
			).toThrow('No validatorsHash preimage data present for the given validatorsHash');
		});

		it('should return undefined when certificate is found through chainOfTrust', () => {
			expect(
				getNextCertificateFromAggregateCommits(
					sampleBlockHeaders,
					[aggregateCommitsSample[2]],
					[validatorsDataAtLastCertifiedheight],
					bftHeights,
					{ height: lastCertifiedBlock.height } as any,
				),
			).toBeUndefined();
		});

		it('should return a valid certificate passing chainOfTrust check', () => {
			const secondBlockHeader = sampleBlockHeaders[1];
			const unsignedCertificate = computeUnsignedCertificateFromBlockHeader(
				new chain.BlockHeader(secondBlockHeader),
			);
			const expectedCertificate = {
				...unsignedCertificate,
				aggregationBits: secondBlockHeader.aggregateCommit.aggregationBits,
				signature: secondBlockHeader.aggregateCommit.certificateSignature,
			};

			expect(
				getNextCertificateFromAggregateCommits(
					sampleBlockHeaders,
					aggregateCommitsSample,
					[validatorsDataAtLastCertifiedheight, sampleValidatorsData],
					bftHeights,
					{ height: lastCertifiedBlock.height } as any,
				),
			).toEqual(expectedCertificate);
		});
	});
});
