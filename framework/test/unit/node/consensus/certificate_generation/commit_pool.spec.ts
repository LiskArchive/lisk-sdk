/*
 * Copyright © 2021 Lisk Foundation
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
import { BlockHeader } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import {
	createAggSig,
	generatePrivateKey,
	getPublicKeyFromPrivateKey,
	getRandomBytes,
	signBLS,
} from '@liskhq/lisk-cryptography';
import { when } from 'jest-when';
import { BFTParameterNotFoundError } from '../../../../../src/modules/bft/errors';
import { CommitPool } from '../../../../../src/node/consensus/certificate_generation/commit_pool';
import { MESSAGE_TAG_CERTIFICATE } from '../../../../../src/node/consensus/certificate_generation/constants';
import { certificateSchema } from '../../../../../src/node/consensus/certificate_generation/schema';
import {
	AggregateCommit,
	Certificate,
	SingleCommit,
} from '../../../../../src/node/consensus/certificate_generation/types';
import { APIContext } from '../../../../../src/node/state_machine/types';
import { createFakeBlockHeader, createTransientAPIContext } from '../../../../../src/testing';

import {
	computeCertificateFromBlockHeader,
	signCertificate,
} from '../../../../../src/node/consensus/certificate_generation/utils';

describe('CommitPool', () => {
	const networkIdentifier = Buffer.alloc(0);

	let commitPool: CommitPool;
	let bftAPI: any;
	let validatorsAPI: any;
	let blockTime: number;
	let chain: any;
	let network: any;
	let getBlockHeaderByHeight: any;

	beforeEach(() => {
		bftAPI = {
			getBFTHeights: jest.fn(),
			getBFTParameters: jest.fn(),
			getNextHeightBFTParameters: jest.fn(),
			selectAggregateCommit: jest.fn(),
		};
		validatorsAPI = {
			getValidatorAccount: jest.fn(),
		};

		blockTime = 10;

		getBlockHeaderByHeight = jest.fn();

		chain = {
			networkIdentifier,
			dataAccess: {
				getBlockHeaderByHeight,
			},
		};

		network = {};

		commitPool = new CommitPool({
			bftAPI,
			validatorsAPI,
			blockTime,
			chain,
			network,
		});
	});

	describe('constructor', () => {
		it.todo('');
	});
	describe('job', () => {
		it.todo('');
	});
	describe('addCommit', () => {
		it.todo('');
	});
	describe('validateCommit', () => {
		it.todo('');
	});
	describe('getCommitsByHeight', () => {
		it.todo('');
	});

	describe('createSingleCommit', () => {
		const blockHeader = createFakeBlockHeader();
		const validatorInfo = {
			address: getRandomBytes(20),
			blsPublicKey: getRandomBytes(48),
			blsSecretKey: getRandomBytes(32),
		};
		const certificate = computeCertificateFromBlockHeader(blockHeader);
		let expectedCommit: SingleCommit;

		beforeEach(() => {
			expectedCommit = {
				blockID: blockHeader.id,
				height: blockHeader.height,
				validatorAddress: validatorInfo.address,
				certificateSignature: signCertificate(
					validatorInfo.blsSecretKey,
					networkIdentifier,
					certificate,
				),
			};
		});

		it('should create a single commit', () => {
			expect(commitPool.createSingleCommit(blockHeader, validatorInfo, networkIdentifier)).toEqual(
				expectedCommit,
			);
		});
	});

	describe('verifyAggregateCommit', () => {
		let height: number;
		let maxHeightCertified: number;
		let maxHeightPrecommitted: number;
		let timestamp: number;
		let apiContext: APIContext;
		let aggregateCommit: AggregateCommit;
		let certificate: Certificate;
		let keysList: Buffer[];
		let privateKeys: Buffer[];
		let publicKeys: Buffer[];
		let weights: number[];
		let threshold: number;
		let signatures: Buffer[];
		let pubKeySignaturePairs: { publicKey: Buffer; signature: Buffer }[];
		let aggregateSignature: Buffer;
		let aggregationBits: Buffer;
		let validators: any;
		let blockHeader: BlockHeader;

		beforeEach(() => {
			height = 1030;
			maxHeightCertified = 1000;
			maxHeightPrecommitted = 1050;
			timestamp = 10300;

			blockHeader = createFakeBlockHeader({
				height,
				timestamp,
			});

			apiContext = createTransientAPIContext({});

			privateKeys = Array.from({ length: 103 }, _ => generatePrivateKey(getRandomBytes(32)));
			publicKeys = privateKeys.map(priv => getPublicKeyFromPrivateKey(priv));

			keysList = [...publicKeys];
			weights = Array.from({ length: 103 }, _ => 1);
			threshold = 33;

			certificate = {
				blockID: blockHeader.id,
				height: blockHeader.height,
				stateRoot: blockHeader.stateRoot as Buffer,
				timestamp: blockHeader.timestamp,
				validatorsHash: blockHeader.validatorsHash as Buffer,
			};

			const encodedCertificate = codec.encode(certificateSchema, certificate);

			signatures = privateKeys.map(privateKey =>
				signBLS(MESSAGE_TAG_CERTIFICATE, networkIdentifier, encodedCertificate, privateKey),
			);

			pubKeySignaturePairs = Array.from({ length: 103 }, (_, i) => ({
				publicKey: publicKeys[i],
				signature: signatures[i],
			}));

			({ aggregationBits, signature: aggregateSignature } = createAggSig(
				publicKeys,
				pubKeySignaturePairs,
			));

			aggregateCommit = {
				aggregationBits,
				certificateSignature: aggregateSignature,
				height,
			};

			validators = weights.map(weight => ({
				address: getRandomBytes(20),
				bftWeight: BigInt(weight),
			}));

			when(chain.dataAccess.getBlockHeaderByHeight).calledWith(height).mockReturnValue(blockHeader);

			bftAPI.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			when(bftAPI.getBFTParameters).calledWith(apiContext, height).mockReturnValue({
				certificateThreshold: threshold,
				validators,
			});

			when(bftAPI.getNextHeightBFTParameters)
				.calledWith(apiContext, maxHeightCertified + 1)
				.mockImplementation(() => {
					throw new BFTParameterNotFoundError();
				});

			for (const [i, validator] of Object.entries<any>(validators)) {
				const index = Number(i);
				const { address } = validator;
				const blsKey = keysList[index];

				when(validatorsAPI.getValidatorAccount)
					.calledWith(apiContext, address)
					.mockReturnValue({ blsKey });
			}
		});

		it('should return true with proper parameters', async () => {
			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeTrue();
		});

		it('should return false when aggregate commit is not signed at height maxHeightCertified', async () => {
			maxHeightCertified = 1080;
			maxHeightPrecommitted = 1100;

			bftAPI.getBFTHeights.mockReturnValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when certificateSignature empty', async () => {
			aggregateCommit = {
				aggregationBits,
				certificateSignature: Buffer.alloc(0),
				height,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregationBits empty', async () => {
			aggregateCommit = {
				aggregationBits: Buffer.alloc(0),
				certificateSignature: aggregateSignature,
				height,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregateCommit height is lesser than equal to maxHeightCertified', async () => {
			aggregateCommit = {
				aggregationBits,
				certificateSignature: aggregateSignature,
				height: 5000,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregateCommit height is more than maxHeightPrecommitted', async () => {
			aggregateCommit = {
				aggregationBits,
				certificateSignature: aggregateSignature,
				height: 15000,
			};

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return false when aggregateCommit height is above nextBFTParameter height minus 1', async () => {
			when(bftAPI.getNextHeightBFTParameters)
				.calledWith(apiContext, maxHeightCertified + 1)
				.mockReturnValue(1020);

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeFalse();
		});

		it('should return true when aggregateCommit height is equal nextBFTParameter height minus 1', async () => {
			when(bftAPI.getNextHeightBFTParameters)
				.calledWith(apiContext, maxHeightCertified + 1)
				.mockReturnValue(height + 1);

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeTrue();
		});

		it('should return true when aggregateCommit height is below nextBFTParameter height minus 1', async () => {
			when(bftAPI.getNextHeightBFTParameters)
				.calledWith(apiContext, maxHeightCertified + 1)
				.mockReturnValue(height + 10);

			const isCommitVerified = await commitPool.verifyAggregateCommit(apiContext, aggregateCommit);

			expect(isCommitVerified).toBeTrue();
		});
	});
	describe('getAggregageCommit', () => {
		it.todo('');
	});
	describe('_aggregateSingleCommits', () => {
		it.todo('');
	});

	describe('_selectAggregateCommit', () => {
		const maxHeightPrecommitted = 1053;
		const maxHeightCertified = 1050;
		const heightNextBFTParameters = 1053;
		const threshold = 1;
		const blockHeader1 = createFakeBlockHeader({ height: 1051 });
		const blockHeader2 = createFakeBlockHeader({ height: 1052 });
		const validatorInfo1 = {
			address: getRandomBytes(20),
			blsPublicKey: getRandomBytes(48),
			blsSecretKey: getRandomBytes(32),
		};
		const validatorInfo2 = {
			address: getRandomBytes(20),
			blsPublicKey: getRandomBytes(48),
			blsSecretKey: getRandomBytes(32),
		};
		const certificate1 = computeCertificateFromBlockHeader(blockHeader1);
		const certificate2 = computeCertificateFromBlockHeader(blockHeader2);
		const singleCommit1 = {
			blockID: blockHeader1.id,
			height: blockHeader1.height,
			validatorAddress: validatorInfo1.address,
			certificateSignature: signCertificate(
				validatorInfo1.blsSecretKey,
				networkIdentifier,
				certificate1,
			),
		};
		const singleCommit2 = {
			blockID: blockHeader2.id,
			height: blockHeader2.height,
			validatorAddress: validatorInfo2.address,
			certificateSignature: signCertificate(
				validatorInfo2.blsSecretKey,
				networkIdentifier,
				certificate2,
			),
		};
		let apiContext: APIContext;

		beforeEach(() => {
			commitPool = new CommitPool({
				bftAPI,
				validatorsAPI,
				blockTime,
				network,
				chain,
			});
			commitPool['_nonGossipedCommits'].set(blockHeader1.height, [singleCommit1]);
			commitPool['_gossipedCommits'].set(blockHeader2.height, [singleCommit2]);
			commitPool['_aggregateSingleCommits'] = jest.fn();
			apiContext = createTransientAPIContext({});

			bftAPI.getBFTHeights.mockResolvedValue({
				maxHeightCertified,
				maxHeightPrecommitted,
			});

			bftAPI.getNextHeightBFTParameters.mockResolvedValue(heightNextBFTParameters);

			bftAPI.getBFTParameters.mockResolvedValue({
				certificateThreshold: threshold,
				validators: [
					{ address: validatorInfo1.address, bftWeight: BigInt(1) },
					{ address: validatorInfo2.address, bftWeight: BigInt(1) },
				],
			});
		});

		it('should call bft api getBFTHeights', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](apiContext);

			// Assert
			expect(commitPool['_bftAPI'].getBFTHeights).toHaveBeenCalledWith(apiContext);
		});

		it('should call bft api getNextHeightBFTParameters', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](apiContext);

			// Assert
			expect(commitPool['_bftAPI'].getNextHeightBFTParameters).toHaveBeenCalledWith(
				apiContext,
				maxHeightCertified + 1,
			);
		});

		it('should call bft api getBFTParameters with min(heightNextBFTParameters - 1, maxHeightPrecommitted)', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](apiContext);

			// Assert
			expect(commitPool['_bftAPI'].getBFTParameters).toHaveBeenCalledWith(
				apiContext,
				Math.min(heightNextBFTParameters - 1, maxHeightPrecommitted),
			);
		});

		it('should call getBFTParameters with maxHeightPrecommitted if getNextHeightBFTParameters does not return a valid height', async () => {
			// Arrange
			bftAPI.getNextHeightBFTParameters.mockRejectedValue(new BFTParameterNotFoundError('Error'));

			// Act
			await commitPool['_selectAggregateCommit'](apiContext);

			// Assert
			expect(commitPool['_bftAPI'].getBFTParameters).toHaveBeenCalledWith(
				apiContext,
				maxHeightPrecommitted,
			);
		});

		it('should call aggregateSingleCommits when it reaches threshold', async () => {
			// Act
			await commitPool['_selectAggregateCommit'](apiContext);

			// Assert
			expect(commitPool['_aggregateSingleCommits']).toHaveBeenCalledWith([singleCommit2]);
		});

		it('should not call aggregateSingleCommits when it does not reach threshold and return empty value aggregateCommit', async () => {
			// Arrange
			const expectedAggregateCommit = {
				height: maxHeightCertified,
				aggregationBits: Buffer.alloc(0),
				certificateSignature: Buffer.alloc(0),
			};
			bftAPI.getBFTParameters.mockReturnValue({
				certificateThreshold: 10,
				validators: [
					{ address: validatorInfo1.address, bftWeight: BigInt(1) },
					{ address: validatorInfo2.address, bftWeight: BigInt(1) },
				],
			});

			// Act
			const result = await commitPool['_selectAggregateCommit'](apiContext);

			// Assert
			expect(commitPool['_aggregateSingleCommits']).not.toHaveBeenCalled();
			expect(result).toEqual(expectedAggregateCommit);
		});
	});
});
