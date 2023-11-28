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

import { Block, BlockAssets, BlockHeader, Event, StateStore } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { Batch, Database, InMemoryDatabase, NotFoundError } from '@liskhq/lisk-db';
import {
	EMPTY_KEY,
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_PARAMETERS,
	STORE_PREFIX_BFT_VOTES,
} from '../../../../src/engine/bft/constants';
import { bftParametersSchema, bftVotesSchema } from '../../../../src/engine/bft/schemas';
import { ChainEndpoint } from '../../../../src/engine/endpoint/chain';
import { createRequestContext } from '../../../utils/mocks/endpoint';

describe('Chain endpoint', () => {
	const DEFAULT_INTERVAL = 10;
	let stateStore: StateStore;
	let endpoint: ChainEndpoint;
	let db: InMemoryDatabase;
	const blockAsset = new BlockAssets();
	const getBlockAttrs = () => ({
		version: 1,
		timestamp: 1009988,
		height: 1009988,
		previousBlockID: Buffer.from('4a462ea57a8c9f72d866c09770e5ec70cef18727', 'hex'),
		stateRoot: Buffer.from('7f9d96a09a3fd17f3478eb7bef3a8bda00e1238b', 'hex'),
		transactionRoot: Buffer.from('b27ca21f40d44113c2090ca8f05fb706c54e87dd', 'hex'),
		assetRoot: Buffer.from('b27ca21f40d44113c2090ca8f05fb706c54e87dd', 'hex'),
		eventRoot: Buffer.from(
			'30dda4fbc395828e5a9f2f8824771e434fce4945a1e7820012440d09dd1e2b6d',
			'hex',
		),
		generatorAddress: Buffer.from('be63fb1c0426573352556f18b21efd5b6183c39c', 'hex'),
		maxHeightPrevoted: 1000988,
		maxHeightGenerated: 1000988,
		impliesMaxPrevotes: true,
		validatorsHash: utils.hash(Buffer.alloc(0)),
		aggregateCommit: {
			height: 0,
			aggregationBits: Buffer.alloc(0),
			certificateSignature: Buffer.alloc(0),
		},
		signature: Buffer.from('6da88e2fd4435e26e02682435f108002ccc3ddd5', 'hex'),
	});
	const blockHeader = new BlockHeader(getBlockAttrs());
	const block = new Block(blockHeader, [], blockAsset);
	const validBlockID = '215b667a32a5cd51a94c9c2046c11fffb08c65748febec099451e3b164452b';

	beforeEach(() => {
		stateStore = new StateStore(new InMemoryDatabase());
		endpoint = new ChainEndpoint({
			chain: {
				dataAccess: {
					getEvents: jest.fn(),
					getBlockByID: jest.fn(),
					getBlockByHeight: jest.fn(),
				},
			} as any,
			bftMethod: {
				getSlotNumber: jest.fn().mockReturnValue(0),
				getSlotTime: jest.fn().mockReturnValue(0),
				blockTime: jest.fn().mockReturnValue(10),
			} as any,
		});
		db = new InMemoryDatabase();
		// For this test we will use only in-memory database
		endpoint.init(db as unknown as Database);
	});

	describe('getEvents', () => {
		beforeEach(() => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getEvents').mockResolvedValue([
				new Event({
					index: 0,
					module: 'token',
					topics: [utils.getRandomBytes(32)],
					name: 'Token Event Name',
					height: 12,
					data: utils.getRandomBytes(32),
				}),
				new Event({
					index: 1,
					module: 'token',
					topics: [utils.getRandomBytes(32)],
					name: 'Token Event Name',
					height: 12,
					data: utils.getRandomBytes(32),
				}),
			]);
		});

		it('should reject if height is not number', async () => {
			await expect(endpoint.getEvents(createRequestContext({ height: 'null' }))).rejects.toThrow(
				'Invalid parameters. height must be zero or a positive number',
			);
		});

		it('should reject if height is a negative number', async () => {
			await expect(endpoint.getEvents(createRequestContext({ height: -1 }))).rejects.toThrow(
				'Invalid parameters. height must be zero or a positive number',
			);
		});

		it('should return all events', async () => {
			const events = await endpoint.getEvents(createRequestContext({ height: 30 }));
			expect(events).toHaveLength(2);
			expect(events[0]).toEqual({
				index: 0,
				module: 'token',
				topics: [expect.any(String)],
				name: 'Token Event Name',
				height: 12,
				data: expect.any(String),
			});
		});
	});

	describe('proveEvents', () => {
		const events = [
			new Event({
				index: 0,
				module: 'transfer',
				topics: [utils.getRandomBytes(32), utils.getRandomBytes(32)],
				name: 'Transfer Event Name',
				height: 12,
				data: utils.getRandomBytes(32),
			}),
			new Event({
				index: 1,
				module: 'transfer',
				topics: [utils.getRandomBytes(32)],
				name: 'Transfer Event Name',
				height: 12,
				data: utils.getRandomBytes(32),
			}),
		];

		beforeEach(() => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getEvents').mockResolvedValue(events);
		});

		it('should reject if height is not number', async () => {
			await expect(endpoint.proveEvents(createRequestContext({ height: 'null' }))).rejects.toThrow(
				".height' should be of type 'integer'",
			);
		});

		it('should reject if height is a negative number', async () => {
			await expect(endpoint.proveEvents(createRequestContext({ height: -1 }))).rejects.toThrow(
				'must be >= 0',
			);
		});

		it('should reject if query contains non hex string', async () => {
			await expect(
				endpoint.proveEvents(createRequestContext({ height: 0, queries: ['zzzzz'] })),
			).rejects.toThrow('must match format "hex"');
		});

		it('should return proof', async () => {
			const query = events[0].keyPair()[0].key.toString('hex');
			const nonExisting = utils.getRandomBytes(12).toString('hex');
			const resp = await endpoint.proveEvents(
				createRequestContext({ height: 12, queries: [query, nonExisting] }),
			);

			expect(resp.queries).toHaveLength(2);
			expect(resp.siblingHashes.length).toBeGreaterThanOrEqual(1);
		});
	});

	describe('getGeneratorList', () => {
		const createBFTParams = () => ({
			prevoteThreshold: BigInt(20),
			precommitThreshold: BigInt(30),
			certificateThreshold: BigInt(40),
			validators: [
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(10),
					blsKey: utils.getRandomBytes(42),
					generatorKey: utils.getRandomBytes(32),
				},
				{
					address: utils.getRandomBytes(20),
					bftWeight: BigInt(10),
					blsKey: utils.getRandomBytes(42),
					generatorKey: utils.getRandomBytes(32),
				},
			],
			validatorsHash: utils.getRandomBytes(32),
		});
		const bftParams = createBFTParams();
		let bftParamsStore: StateStore;
		let votesStore: StateStore;

		beforeEach(async () => {
			bftParamsStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_PARAMETERS);
			await bftParamsStore.setWithSchema(utils.intToBuffer(3, 4), bftParams, bftParametersSchema);
			votesStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_BFT_VOTES);
			await votesStore.setWithSchema(
				EMPTY_KEY,
				{
					maxHeightPrevoted: 10,
					maxHeightPrecommitted: 0,
					maxHeightCertified: 0,
					blockBFTInfos: [
						{
							height: 2,
							generatorAddress: bftParams.validators[1].address,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 1,
							generatorAddress: bftParams.validators[0].address,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
					],
					activeValidatorsVoteInfo: [],
				},
				bftVotesSchema,
			);
			const batch = new Batch();
			stateStore.finalize(db);
			await db.write(batch);
		});

		it('should return generator list with address and nextAllocatedTime', async () => {
			const { list } = await endpoint.getGeneratorList(createRequestContext({}));

			expect(list).toHaveLength(2);
			expect(typeof list[0].address).toBe('string');
			expect(list[0].address).toHaveLength(41);
			expect(typeof list[0].nextAllocatedTime).toBe('number');
		});

		it(`should return generator list with nextAllocatedTime values ${DEFAULT_INTERVAL} apart`, async () => {
			const { list } = await endpoint.getGeneratorList(createRequestContext({}));

			expect(list[1].nextAllocatedTime - list[0].nextAllocatedTime).toBe(DEFAULT_INTERVAL);
		});
	});

	describe('getBlockByID', () => {
		it('should throw if provided block id is not valid', async () => {
			await expect(
				endpoint.getBlockByID(createRequestContext({ id: 'invalid id' })),
			).rejects.toThrow('Invalid parameters. id must be a valid hex string.');
		});

		it('should return the block if provided id is valid', async () => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getBlockByID').mockResolvedValue(block);
			await expect(
				endpoint.getBlockByID(
					createRequestContext({
						id: validBlockID,
					}),
				),
			).resolves.toEqual(block.toJSON());
		});
	});

	describe('getBlocksByIDs', () => {
		it('should throw if the provided block ids is an empty array or not a valid array', async () => {
			await expect(endpoint.getBlocksByIDs(createRequestContext({ ids: [] }))).rejects.toThrow(
				'Invalid parameters. ids must be a non empty array.',
			);

			await expect(
				endpoint.getBlocksByIDs(createRequestContext({ ids: 'not an array' })),
			).rejects.toThrow('Invalid parameters. ids must be a non empty array.');
		});

		it('should throw if any of the provided block ids is not valid', async () => {
			await expect(
				endpoint.getBlocksByIDs(createRequestContext({ ids: [validBlockID, 'invalid id'] })),
			).rejects.toThrow('Invalid parameters. id must a valid hex string.');
		});

		it('should return empty result if the provided block ids are not found', async () => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getBlockByID').mockImplementation(() => {
				throw new NotFoundError();
			});

			await expect(
				endpoint.getBlocksByIDs(createRequestContext({ ids: [validBlockID] })),
			).resolves.toEqual([]);
		});

		it('should throw if dataAccess throws an error other than NotFoundError', async () => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getBlockByID').mockImplementation(() => {
				throw new Error();
			});

			await expect(
				endpoint.getBlocksByIDs(createRequestContext({ ids: [validBlockID] })),
			).rejects.toThrow();
		});

		it('should return a collection of blocks', async () => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getBlockByID').mockResolvedValue(block);

			await expect(
				endpoint.getBlocksByIDs(createRequestContext({ ids: [validBlockID] })),
			).resolves.toEqual([block.toJSON()]);
		});
	});

	describe('getBlockByHeight', () => {
		it('should throw if provided height is invalid', async () => {
			await expect(
				endpoint.getBlockByHeight(createRequestContext({ height: 'incorrect height' })),
			).rejects.toThrow('Invalid parameters. height must be a number.');
		});

		it('should rerturn a block if the provided height is valid', async () => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getBlockByHeight').mockResolvedValue(block);

			await expect(endpoint.getBlockByHeight(createRequestContext({ height: 1 }))).resolves.toEqual(
				block.toJSON(),
			);
		});
	});
});
