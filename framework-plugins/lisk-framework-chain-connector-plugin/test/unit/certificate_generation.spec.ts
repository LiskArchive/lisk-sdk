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
	Certificate,
	ChainAccount,
	ChainStatus,
	LIVENESS_LIMIT,
	chain,
	computeCertificateFromBlockHeader,
	cryptography,
	testing,
	db,
} from 'lisk-sdk';
import {
	checkChainOfTrust,
	getCertificateFromAggregateCommit,
	getNextCertificateFromAggregateCommits,
	validateCertificate,
	verifyLiveness,
} from '../../src/certificate_generation';
import { BlockHeader } from '../../src/types';
import { ChainConnectorStore } from '../../src/db';
import {
	ADDRESS_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
	DB_KEY_SIDECHAIN,
	HASH_LENGTH,
} from '../../src/constants';

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

			const expectedCertificate = computeCertificateFromBlockHeader(
				new chain.BlockHeader(firstBlockHeader),
			);
			expectedCertificate.aggregationBits = aggregateCommit.aggregationBits;
			expectedCertificate.signature = aggregateCommit.certificateSignature;
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
			const expectedCertificate = computeCertificateFromBlockHeader(
				new chain.BlockHeader(secondBlockHeader),
			);
			expectedCertificate.aggregationBits = secondBlockHeader.aggregateCommit.aggregationBits;
			expectedCertificate.signature = secondBlockHeader.aggregateCommit.certificateSignature;
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

	describe('verifyLiveness', () => {
		const apiClientMock = {
			invoke: jest.fn(),
		};

		let mainchainAPIClient: any;

		beforeEach(() => {
			mainchainAPIClient = apiClientMock;
		});

		it('should not validate if provided chain ID is not live', async () => {
			mainchainAPIClient.invoke.mockResolvedValue(false);

			const result = await verifyLiveness(Buffer.from('10'), 10, 5, mainchainAPIClient);

			expect(result).toBe(false);
		});

		it('should not validate if the condition blockTimestamp - certificateTimestamp < LIVENESS_LIMIT / 2, is invalid', async () => {
			mainchainAPIClient.invoke.mockResolvedValue(true);

			const blockTimestamp = LIVENESS_LIMIT;
			const certificateTimestamp = LIVENESS_LIMIT / 2;

			const result = await verifyLiveness(
				Buffer.from('10'),
				certificateTimestamp,
				blockTimestamp,
				mainchainAPIClient,
			);

			expect(result).toBe(false);
		});

		it('should validate if provided chain ID is live and blockTimestamp - certificateTimestamp < LIVENESS_LIMIT / 2', async () => {
			mainchainAPIClient.invoke.mockResolvedValue(true);

			const result = await verifyLiveness(Buffer.from('10'), 10, 5, mainchainAPIClient);

			expect(result).toBe(true);
		});
	});

	describe('validateCertificate', () => {
		const apiClientMock = {
			invoke: jest.fn(),
		};

		let sidechainStore: ChainConnectorStore;
		let mainchainAPIClient: any;

		beforeEach(() => {
			sidechainStore = new ChainConnectorStore(new db.InMemoryDatabase() as any, DB_KEY_SIDECHAIN);
			mainchainAPIClient = apiClientMock;
		});

		it('should not validate if chain is terminated', async () => {
			const certificateBytes = Buffer.from('10');
			const certificate = { height: 5 } as Certificate;
			const blockHeader = {} as BlockHeader;
			const chainAccount = { status: ChainStatus.TERMINATED } as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await validateCertificate(
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
				sidechainStore,
				mainchainAPIClient,
				false,
			);

			expect(result.status).toBe(false);
		});

		it('should not validate if certificate height is not greater than height of last certificate', async () => {
			const certificateBytes = Buffer.from('10');
			const certificate = { height: 5 } as Certificate;
			const blockHeader = {} as BlockHeader;
			const chainAccout = {
				status: ChainStatus.ACTIVE,
				lastCertificate: { height: 5 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await validateCertificate(
				certificateBytes,
				certificate,
				blockHeader,
				chainAccout,
				sendingChainID,
				sidechainStore,
				mainchainAPIClient,
				false,
			);

			expect(result.status).toBe(false);
		});

		it('should not validate if liveness is not valid', async () => {
			mainchainAPIClient.invoke.mockResolvedValue(false);

			const certificateBytes = Buffer.from('10');
			const certificate = { height: 5 } as Certificate;
			const blockHeader = {} as BlockHeader;
			const chainAccount = {
				status: ChainStatus.ACTIVE,
				lastCertificate: { height: 4 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await validateCertificate(
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
				sidechainStore,
				mainchainAPIClient,
				false,
			);

			expect(result.status).toBe(false);
		});

		it('should validate if chain is active and has valid liveness', async () => {
			mainchainAPIClient.invoke.mockResolvedValue(true);
			await sidechainStore.setValidatorsHashPreimage([
				{
					validatorsHash: Buffer.from('10'),
					validators: [
						{
							address: cryptography.utils.getRandomBytes(20),
							blsKey: Buffer.from('10'),
							bftWeight: BigInt(10),
						},
					],
					certificateThreshold: BigInt(2),
				},
			]);
			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(true);
			const timestampNow = Date.now();
			const certificateBytes = Buffer.from('10');
			const certificate = {
				height: 5,
				timestamp: timestampNow - LIVENESS_LIMIT / 2 + 1000,
			} as Certificate;
			const blockHeader = {
				timestamp: timestampNow,
				validatorsHash: Buffer.from('10'),
			} as BlockHeader;
			const chainAccount = {
				status: ChainStatus.ACTIVE,
				lastCertificate: { height: 4 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await validateCertificate(
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
				sidechainStore,
				mainchainAPIClient,
				false,
			);

			expect(result.status).toBe(true);
		});

		it('should not validate if weighted aggregate signature validation fails', async () => {
			mainchainAPIClient.invoke.mockResolvedValue(true);
			await sidechainStore.setValidatorsHashPreimage([
				{
					validatorsHash: Buffer.from('10'),
					validators: [
						{
							address: cryptography.utils.getRandomBytes(20),
							blsKey: Buffer.from('10'),
							bftWeight: BigInt(10),
						},
					],
					certificateThreshold: BigInt(2),
				},
			]);

			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);

			const timestampNow = Date.now();
			const certificateBytes = Buffer.from('10');
			const certificate = {
				height: 5,
				aggregationBits: Buffer.from('10'),
				signature: Buffer.from('10'),
				timestamp: timestampNow - LIVENESS_LIMIT / 2 + 1000,
			} as Certificate;
			const blockHeader = {
				validatorsHash: Buffer.from('10'),
				timestamp: timestampNow,
			} as BlockHeader;
			const sendingChainID = Buffer.from('01');

			const chainAccount = {
				status: 0,
				name: 'chain1',
				lastCertificate: { height: 4 },
			} as ChainAccount;

			const result = await validateCertificate(
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
				sidechainStore,
				mainchainAPIClient,
				false,
			);

			expect(result.status).toBe(false);
		});

		it('should not validate if ValidatorsData for block header is undefined', async () => {
			mainchainAPIClient.invoke.mockResolvedValue(true);

			await sidechainStore.setValidatorsHashPreimage([
				{
					validatorsHash: Buffer.from('10'),
					validators: [
						{
							address: cryptography.utils.getRandomBytes(20),
							blsKey: Buffer.from('10'),
							bftWeight: BigInt(10),
						},
					],
					certificateThreshold: BigInt(2),
				},
			]);

			jest.spyOn(cryptography.bls, 'verifyWeightedAggSig').mockReturnValue(false);

			const timestampNow = Date.now();
			const certificateBytes = Buffer.from('10');
			const certificate = {
				height: 5,
				aggregationBits: Buffer.from('10'),
				signature: Buffer.from('10'),
				timestamp: timestampNow - LIVENESS_LIMIT / 2 + 1000,
			} as Certificate;
			const blockHeader = {
				validatorsHash: Buffer.from('11'),
				timestamp: timestampNow,
			} as BlockHeader;
			const chainAccount = {
				status: 0,
				name: 'chain1',
				lastCertificate: { height: 4 },
			} as ChainAccount;
			const sendingChainID = Buffer.from('01');

			const result = await validateCertificate(
				certificateBytes,
				certificate,
				blockHeader,
				chainAccount,
				sendingChainID,
				sidechainStore,
				mainchainAPIClient,
				false,
			);

			expect(result.status).toBe(false);
		});
	});
});
