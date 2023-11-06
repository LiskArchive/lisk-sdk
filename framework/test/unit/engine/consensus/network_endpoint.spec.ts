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

import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { Block, Chain } from '@liskhq/lisk-chain';
import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { SingleCommit } from '.../../../src/engine/consensus//certificate_generation/types';
import {
	computeUnsignedCertificateFromBlockHeader,
	signCertificate,
} from '.../../../src/engine/consensus//certificate_generation/utils';
import { NetworkEndpoint } from '../../../../src/engine/consensus/network_endpoint';
import {
	getBlocksFromIdRequestSchema,
	getHighestCommonBlockRequestSchema,
	getHighestCommonBlockResponseSchema,
} from '../../../../src/engine/consensus/schema';
import { Network } from '../../../../src/engine/network';
import { loggerMock } from '../../../../src/testing/mocks';
import { createValidDefaultBlock } from '../../../fixtures';
import { CommitPool } from '../../../../src/engine/consensus/certificate_generation/commit_pool';
import { createFakeBlockHeader } from '../../../../src/testing/create_block';
import {
	singleCommitSchema,
	singleCommitsNetworkPacketSchema,
} from '../../../../src/engine/consensus/certificate_generation/schema';

describe('p2p endpoint', () => {
	const defaultPeerId = 'peer-id';
	const defaultRateLimit = 10000;

	let endpoint: NetworkEndpoint;
	let chain: Chain;
	let network: Network;
	let lastBlock: Block;
	let commitPool: CommitPool;
	let db: Database;

	beforeEach(async () => {
		lastBlock = await createValidDefaultBlock({ header: { height: 2 } });
		const nextBlock = await createValidDefaultBlock({ header: { height: 3 } });
		chain = {
			dataAccess: {
				decode: jest.fn(),
				encode: jest.fn().mockReturnValue(lastBlock.getBytes()),
				getBlockHeaderByID: jest.fn().mockResolvedValue({ height: 2 }),
				getBlocksByHeightBetween: jest.fn().mockResolvedValue([lastBlock, nextBlock]),
				getHighestCommonBlockID: jest.fn(),
				encodeBlockHeader: jest.fn().mockReturnValue(lastBlock.header.getBytes()),
			},
			lastBlock,
		} as unknown as Chain;
		network = {
			applyPenaltyOnPeer: jest.fn(),
		} as unknown as Network;
		commitPool = {
			validateCommit: jest.fn(),
			addCommit: jest.fn(),
		} as unknown as CommitPool;
		db = new InMemoryDatabase() as unknown as Database;
		endpoint = new NetworkEndpoint({
			chain,
			logger: loggerMock,
			network,
			commitPool,
			db,
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
				blockId: utils.getRandomBytes(32),
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
				blockId: utils.getRandomBytes(1),
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
			const id = utils.getRandomBytes(32);
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
				ids: [utils.getRandomBytes(32)],
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
				const ids = [utils.getRandomBytes(32)];
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
		const chainID = Buffer.alloc(0);
		const blockHeader = createFakeBlockHeader();
		const unsignedCertificate = computeUnsignedCertificateFromBlockHeader(blockHeader);
		const validatorInfo = {
			address: utils.getRandomBytes(20),
			blsPublicKey: utils.getRandomBytes(48),
			blsSecretKey: utils.getRandomBytes(32),
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
					chainID,
					unsignedCertificate,
				),
			};
			encodedValidCommit = codec.encode(singleCommitsNetworkPacketSchema, {
				commits: [codec.encode(singleCommitSchema, validCommit)],
			});
		});

		it('should add message with valid commit', async () => {
			(commitPool.validateCommit as jest.Mock).mockResolvedValue(true);
			commitPool.addCommit = jest.fn();
			await expect(
				endpoint.handleEventSingleCommit(encodedValidCommit, defaultPeerId),
			).resolves.not.toThrow();
			expect(commitPool.validateCommit).toHaveBeenCalled();
			expect(commitPool.addCommit).toHaveBeenCalled();
		});

		it('should not add message with invalid commit', async () => {
			(commitPool.validateCommit as jest.Mock).mockResolvedValue(false);
			commitPool.addCommit = jest.fn();
			await expect(
				endpoint.handleEventSingleCommit(encodedValidCommit, defaultPeerId),
			).resolves.not.toThrow();
			expect(commitPool.validateCommit).toHaveBeenCalled();
			expect(commitPool.addCommit).not.toHaveBeenCalled();
		});

		it('should apply penalty when received message is not Buffer', async () => {
			await expect(endpoint.handleEventSingleCommit('some data', defaultPeerId)).rejects.toThrow();
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});

		it('should apply penalty when un-decodable data is received', async () => {
			await expect(
				endpoint.handleEventSingleCommit(Buffer.from('abc', 'utf8'), defaultPeerId),
			).rejects.toThrow();
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});

		it('should apply penalty when invalid data value is received', async () => {
			const invalidCommit = {
				commits: [
					codec.encode(singleCommitSchema, {
						...validCommit,
						certificateSignature: utils.getRandomBytes(2),
					}),
				],
			};
			const encodedInvalidCommit = codec.encode(singleCommitsNetworkPacketSchema, invalidCommit);
			await expect(
				endpoint.handleEventSingleCommit(encodedInvalidCommit, defaultPeerId),
			).rejects.toThrow('minLength not satisfied');
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});

		it('should apply penalty when invalid commit is received', async () => {
			(commitPool.validateCommit as jest.Mock).mockImplementation(() => {
				throw new Error('Invalid commit');
			});
			await expect(
				endpoint.handleEventSingleCommit(encodedValidCommit, defaultPeerId),
			).rejects.toThrow('Invalid commit');
			expect(network.applyPenaltyOnPeer).toHaveBeenCalledWith({
				peerId: defaultPeerId,
				penalty: 100,
			});
		});
	});
});
