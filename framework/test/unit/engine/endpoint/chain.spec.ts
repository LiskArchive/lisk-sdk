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

import { Event, StateStore } from '@liskhq/lisk-chain';
import { utils } from '@liskhq/lisk-cryptography';
import { Batch, Database, InMemoryDatabase } from '@liskhq/lisk-db';
import {
	EMPTY_KEY,
	MODULE_STORE_PREFIX_BFT,
	STORE_PREFIX_BFT_VOTES,
	STORE_PREFIX_GENERATOR_KEYS,
} from '../../../../src/engine/bft/constants';
import { bftVotesSchema, generatorKeysSchema } from '../../../../src/engine/bft/schemas';
import { ChainEndpoint } from '../../../../src/engine/endpoint/chain';
import { createRequestContext } from '../../../utils/mocks/endpoint';

describe('Chain endpoint', () => {
	const DEFAULT_INTERVAL = 10;
	const GENESIS_BLOCK_TIMESTAMP = 1610643809;
	let stateStore: StateStore;
	let endpoint: ChainEndpoint;
	let db: InMemoryDatabase;

	beforeEach(() => {
		stateStore = new StateStore(new InMemoryDatabase());
		endpoint = new ChainEndpoint({
			chain: {
				dataAccess: {
					getEvents: jest.fn(),
				},
			} as any,
			genesisBlockTimestamp: GENESIS_BLOCK_TIMESTAMP,
			interval: DEFAULT_INTERVAL,
		});
		db = new InMemoryDatabase();
		// For this test we will use only in-memory database
		endpoint.init((db as unknown) as Database);
	});

	describe('getEvents', () => {
		beforeEach(() => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getEvents').mockResolvedValue([
				new Event({
					index: 0,
					module: 'token',
					topics: [utils.getRandomBytes(32)],
					typeID: Buffer.from([0, 0, 0, 1]),
					data: utils.getRandomBytes(32),
				}),
				new Event({
					index: 1,
					module: 'token',
					topics: [utils.getRandomBytes(32)],
					typeID: Buffer.from([0, 0, 0, 1]),
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
				typeID: '00000001',
				data: expect.any(String),
			});
		});
	});

	describe('proveEvents', () => {
		beforeEach(() => {
			jest.spyOn(endpoint['_chain'].dataAccess, 'getEvents').mockResolvedValue([
				new Event({
					index: 0,
					module: 'transfer',
					topics: [utils.getRandomBytes(32)],
					typeID: Buffer.from([0, 0, 0, 1]),
					data: utils.getRandomBytes(32),
				}),
				new Event({
					index: 1,
					module: 'transfer',
					topics: [utils.getRandomBytes(32)],
					typeID: Buffer.from([0, 0, 0, 1]),
					data: utils.getRandomBytes(32),
				}),
			]);
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
			const randomQuery = '453c17c88e72841d5f6974711d947ffde52290daa4e906aeea460ef7871efa93';
			const resp = await endpoint.proveEvents(
				createRequestContext({ height: 0, queries: [randomQuery] }),
			);

			expect(resp.queries).toHaveLength(1);
			expect(resp.siblingHashes).toHaveLength(1);
		});
	});

	describe('getGeneratorList', () => {
		const createKeys = () => ({
			generators: [
				{
					address: utils.getRandomBytes(20),
					generatorKey: utils.getRandomBytes(32),
				},
				{
					address: utils.getRandomBytes(20),
					generatorKey: utils.getRandomBytes(32),
				},
			],
		});
		const keys = createKeys();
		let keysStore: StateStore;
		let votesStore: StateStore;

		beforeEach(async () => {
			keysStore = stateStore.getStore(MODULE_STORE_PREFIX_BFT, STORE_PREFIX_GENERATOR_KEYS);
			await keysStore.setWithSchema(utils.intToBuffer(3, 4), keys, generatorKeysSchema);
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
							generatorAddress: keys.generators[1].address,
							maxHeightGenerated: 0,
							maxHeightPrevoted: 0,
							prevoteWeight: 0,
							precommitWeight: 0,
						},
						{
							height: 1,
							generatorAddress: keys.generators[0].address,
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
});
