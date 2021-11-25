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

import { Block, Chain } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { NetworkEndpoint } from '../../../../src/node/consensus/network_endpoint';
import {
	getBlocksFromIdRequestSchema,
	getHighestCommonBlockRequestSchema,
	getHighestCommonBlockResponseSchema,
} from '../../../../src/node/consensus/schema';
import { Network } from '../../../../src/node/network';
import { loggerMock } from '../../../../src/testing/mocks';
import { createValidDefaultBlock } from '../../../fixtures';
import { CommitPool } from '../../../../src/node/consensus/certificate_generation/commit_pool';
import { singleCommitSchema } from '.../../../src/node/consensus/certificate_generation/schema';
import { SingleCommit } from '.../../../src/node/consensus//certificate_generation/types';
import {
	computeCertificateFromBlockHeader,
	signCertificate,
} from '.../../../src/node/consensus//certificate_generation/utils';
import { createFakeBlockHeader } from '../../../../src/testing/create_block';

describe('p2p endpoint', () => {
	const defaultPeerId = 'peer-id';
	const defaultRateLimit = 10000;

	let endpoint: NetworkEndpoint;
	let chain: Chain;
	let network: Network;
	let lastBlock: Block;
	let commitPool: CommitPool;

	beforeEach(async () => {
		lastBlock = await createValidDefaultBlock({ header: { height: 2 } });
		const nextBlock = await createValidDefaultBlock({ header: { height: 3 } });
		chain = ({
			dataAccess: {
				decode: jest.fn(),
				encode: jest.fn().mockReturnValue(lastBlock.getBytes()),
				getBlockHeaderByID: jest.fn().mockResolvedValue({ height: 2 }),
				getBlocksByHeightBetween: jest.fn().mockResolvedValue([lastBlock, nextBlock]),
				getHighestCommonBlockID: jest.fn(),
				encodeBlockHeader: jest.fn().mockReturnValue(lastBlock.header.getBytes()),
			},
			lastBlock,
		} as unknown) as Chain;
		network = ({
			applyPenaltyOnPeer: jest.fn(),
		} as unknown) as Network;
		commitPool = ({
			validateCommit: jest.fn(),
			addCommit: jest.fn(),
		} as unknown) as CommitPool;
		endpoint = new NetworkEndpoint({
			chain,
			logger: loggerMock,
			network,
			commitPool,
		});
		jest.useFakeTimers();
	});

	describe('handleRPCGetLastBlock', () => {
		const DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY = 10;

		it('should apply penalty if call exceeds rate limit', () => {
			// Arrange
			[...new Array(DEFAULT_LAST_BLOCK_RATE_LIMIT_FREQUENCY + 1)].map(() =>
				endpoint.handleRPCGetLastBlock(defaultPeerId),
			);
			// Act
			jest.advanceTimersByTime(defaultRateLimit);

			// Assert
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 10,
			});
		});

		it('should return last block as bytes', () => {
			const res = endpoint.handleRPCGetLastBlock(defaultPeerId);
			expect(res).toEqual(lastBlock.getBytes());
		});
	});

	describe('handleRPCGetBlocksFromId', () => {
		const DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY = 100;

		it('should apply penalty if call exceeds rate limit', () => {
			// Arrange
			const blockIds = codec.encode(getBlocksFromIdRequestSchema, {
				blockId: getRandomBytes(32),
			});
			// Act
			[...new Array(DEFAULT_BLOCKS_FROM_IDS_RATE_LIMIT_FREQUENCY + 1)].map(async () =>
				endpoint.handleRPCGetBlocksFromId(blockIds, defaultPeerId),
			);
			jest.advanceTimersByTime(defaultRateLimit);

			// Assert
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 10,
			});
		});

		it('should apply penalty on the peer if request data is invalid', async () => {
			const invalidBytes = Buffer.from([244, 21, 21]);
			// Act
			await expect(
				endpoint.handleRPCGetBlocksFromId(invalidBytes, defaultPeerId),
			).rejects.toThrow();
			// Assert
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});

		it('should apply penalty on the peer if request format is invalid', async () => {
			// Arrange
			const blockIds = codec.encode(getBlocksFromIdRequestSchema, {
				blockId: getRandomBytes(1),
			});
			// Act
			await expect(endpoint.handleRPCGetBlocksFromId(blockIds, defaultPeerId)).rejects.toThrow();

			// Assert
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});

		it('should return blocks from next height', async () => {
			// Arrange
			const id = getRandomBytes(32);
			const blockIds = codec.encode(getBlocksFromIdRequestSchema, {
				blockId: id,
			});
			// Act
			await endpoint.handleRPCGetBlocksFromId(blockIds, defaultPeerId);
			// Assert
			expect(chain.dataAccess.getBlockHeaderByID).toHaveBeenCalledWith(id);
			expect(chain.dataAccess.getBlocksByHeightBetween).toHaveBeenCalledWith(3, 105);
		});
	});

	describe('handleRPCGetHighestCommonBlock', () => {
		const DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY = 10;

		it('should apply penalty if call exceeds rate limit', () => {
			const blockIds = codec.encode(getHighestCommonBlockRequestSchema, {
				ids: [getRandomBytes(32)],
			});
			[...new Array(DEFAULT_COMMON_BLOCK_RATE_LIMIT_FREQUENCY + 1)].map(async () =>
				endpoint.handleRPCGetHighestCommonBlock(blockIds, defaultPeerId),
			);
			jest.advanceTimersByTime(defaultRateLimit);

			// Assert
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 10,
			});
		});

		describe('when commonBlock has not been found', () => {
			beforeEach(() => {
				(chain.dataAccess.getHighestCommonBlockID as jest.Mock).mockResolvedValue(undefined);
			});

			it('should return null', async () => {
				// Arrange
				const ids = [getRandomBytes(32)];
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, { ids });

				// Act
				const result = await endpoint.handleRPCGetHighestCommonBlock(blockIds, defaultPeerId);

				// Assert
				expect(chain.dataAccess.getHighestCommonBlockID).toHaveBeenCalledWith(ids);
				expect(result).toEqual(
					codec.encode(getHighestCommonBlockResponseSchema, { id: Buffer.alloc(0) }),
				);
			});
		});

		describe('when commonBlock has been found', () => {
			let validBlock: Block;

			beforeEach(async () => {
				validBlock = await createValidDefaultBlock();
				(chain.dataAccess.getHighestCommonBlockID as jest.Mock).mockResolvedValue(
					validBlock.header.id,
				);
			});

			it('should return the highest common block header', async () => {
				// Arrange
				const ids = [validBlock.header.id];
				const blockIds = codec.encode(getHighestCommonBlockRequestSchema, { ids });

				// Act
				const result = await endpoint.handleRPCGetHighestCommonBlock(blockIds, defaultPeerId);

				// Assert
				expect(chain.dataAccess.getHighestCommonBlockID).toHaveBeenCalledWith(ids);
				expect(result).toEqual(
					codec.encode(getHighestCommonBlockResponseSchema, { id: validBlock.header.id }),
				);
			});
		});
	});

	describe('handleEventSingleCommit', () => {
		const networkIdentifier = Buffer.alloc(0);
		const blockHeader = createFakeBlockHeader();
		const certificate = computeCertificateFromBlockHeader(blockHeader);
		const validatorInfo = {
			address: getRandomBytes(20),
			blsPublicKey: getRandomBytes(48),
			blsSecretKey: getRandomBytes(32),
		};
		let validCommit: SingleCommit;
		let encodedValidCommit: Buffer;

		beforeEach(() => {
			validCommit = {
				blockID: blockHeader.id,
				height: blockHeader.height,
				validatorAddress: validatorInfo.address,
				certificateSignature: signCertificate(
					validatorInfo.blsSecretKey,
					networkIdentifier,
					certificate,
				),
			};

			encodedValidCommit = codec.encode(singleCommitSchema, validCommit);
		});

		it('should add commit with valid commit', () => {
			expect(() =>
				endpoint.handleEventSingleCommit(encodedValidCommit, defaultPeerId),
			).not.toThrow();
			expect(commitPool.validateCommit).toHaveBeenCalled();
			expect(commitPool.addCommit).toHaveBeenCalled();
		});

		it('should apply penalty when un-decodable data is received', () => {
			expect(() =>
				endpoint.handleEventSingleCommit(Buffer.from('abc', 'utf8'), defaultPeerId),
			).toThrow();
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});

		it('should apply penalty when invalid data value is received', () => {
			const invalidCommit = {
				...validCommit,
				certificateSignature: getRandomBytes(2),
			};
			const encodedInvalidCommit = codec.encode(singleCommitSchema, invalidCommit);
			expect(() => endpoint.handleEventSingleCommit(encodedInvalidCommit, defaultPeerId)).toThrow(
				'minLength not satisfied',
			);
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});

		it('should apply penalty when invalid commit is received', () => {
			commitPool.validateCommit = jest.fn(() => {
				throw new Error('Invalid commit');
			});
			expect(() => endpoint.handleEventSingleCommit(encodedValidCommit, defaultPeerId)).toThrow(
				'Invalid commit',
			);
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});
	});
});
