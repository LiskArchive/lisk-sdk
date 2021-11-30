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
	let blockTime;
	let chain: any;
	let network: any;
	let getBlockHeaderByHeight: any;

	beforeEach(() => {
		bftAPI = {
			getBFTHeights: jest.fn(),
			getBFTParameters: jest.fn(),
			getNextHeightBFTParameters: jest.fn(),
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
		it.todo('');
	});
});
