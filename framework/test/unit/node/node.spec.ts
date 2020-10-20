/*
 * Copyright © 2020 Lisk Foundation
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

import { BFT } from '@liskhq/lisk-bft';
import { KVStore } from '@liskhq/lisk-db';
import { TransactionPool } from '@liskhq/lisk-transaction-pool';
import { when } from 'jest-when';
import { TokenModule } from '../../../src/modules';
import { Forger, HighFeeForgingStrategy } from '../../../src/node/forger';
import { Network } from '../../../src/node/network';
import { Node } from '../../../src/node/node';
import { Processor } from '../../../src/node/processor';
import { Synchronizer } from '../../../src/node/synchronizer/synchronizer';
import { genesisBlock } from '../../fixtures';
import * as genesisBlockJSON from '../../fixtures/config/devnet/genesis_block.json';
import { cacheConfig, nodeOptions } from '../../fixtures/node';
import { createMockBus } from '../../utils/channel';

jest.mock('@liskhq/lisk-db');

describe('Node', () => {
	let node: Node;
	let subscribedEvents: any;
	const stubs: any = {};
	const lastBlock = genesisBlock();
	let blockchainDB: KVStore;
	let forgerDB: KVStore;
	let nodeDB: KVStore;

	beforeEach(() => {
		// Arrange
		subscribedEvents = {};

		jest.spyOn(Processor.prototype, 'init').mockResolvedValue(undefined);
		jest.spyOn(Synchronizer.prototype, 'init').mockResolvedValue(undefined);

		blockchainDB = new KVStore('blockchain.db');
		forgerDB = new KVStore('forger.db');
		nodeDB = new KVStore('node.db');

		/* Arranging Stubs start */
		stubs.logger = {
			trace: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			fatal: jest.fn(),
			info: jest.fn(),
			cleanup: jest.fn(),
		};

		stubs.forgerDB = {
			get: jest.fn(),
			put: jest.fn(),
			close: jest.fn(),
		};

		stubs.channel = {
			invoke: jest.fn(),
			subscribe: jest.fn((event, cb) => {
				subscribedEvents[event] = cb;
			}),
			once: jest.fn(),
			registerToBus: jest.fn(),
		};

		when(stubs.channel.invoke)
			.calledWith('app:getComponentConfig', 'cache')
			.mockResolvedValue(cacheConfig as never);

		node = new Node({
			options: nodeOptions,
			genesisBlockJSON,
		});
		node.registerModule(new TokenModule(nodeOptions.genesisConfig));
	});

	describe('constructor', () => {
		it('should throw error when waitThreshold is greater than blockTime', () => {
			const invalidChainOptions = {
				...nodeOptions,
				forging: {
					waitThreshold: 5,
				},
				genesisConfig: {
					...nodeOptions.genesisConfig,
					blockTime: 4,
				},
			};

			expect(
				() =>
					new Node({
						options: invalidChainOptions as any,
						genesisBlockJSON,
					}),
			).toThrow('forging.waitThreshold=5 is greater or equal to genesisConfig.blockTime=4');
		});

		it('should throw error when waitThreshold is same as blockTime', () => {
			const invalidChainOptions = {
				...nodeOptions,
				forging: {
					waitThreshold: 5,
				},
				genesisConfig: {
					...nodeOptions.genesisConfig,
					blockTime: 5,
				},
			};

			expect(
				() =>
					new Node({
						options: invalidChainOptions as any,
						genesisBlockJSON,
					}),
			).toThrow('forging.waitThreshold=5 is greater or equal to genesisConfig.blockTime=5');
		});
	});

	describe('init', () => {
		beforeEach(async () => {
			jest.spyOn(Network.prototype, 'applyNodeInfo');
			jest.spyOn(TransactionPool.prototype, 'start');
			jest.spyOn(node as any, '_startForging');
			// Act
			await node.init({
				bus: createMockBus() as any,
				channel: stubs.channel,
				blockchainDB,
				forgerDB,
				nodeDB,
				logger: stubs.logger,
			});
		});

		it('should initialize scope object with valid structure', () => {
			expect(node).toHaveProperty('_options');
			expect(node).toHaveProperty('_channel');
			expect(node).toHaveProperty('_networkIdentifier');
		});

		describe('_initModules', () => {
			it('should initialize bft module', () => {
				expect(node['_bft']).toBeInstanceOf(BFT);
			});

			it('should initialize forger module', () => {
				expect(node['_forger']).toBeInstanceOf(Forger);
			});

			it('should initialize forger module with high fee strategy', () => {
				expect(node['_forger']['_forgingStrategy']).toBeInstanceOf(HighFeeForgingStrategy);
			});
		});

		it('should invoke Processor.init', () => {
			expect(node['_processor'].init).toHaveBeenCalledTimes(1);
		});

		it('should call "applyNodeInfo" with correct params', () => {
			// Assert
			return expect(node['_networkModule'].applyNodeInfo).toHaveBeenCalledWith({
				height: lastBlock.header.height,
				blockVersion: lastBlock.header.version,
				maxHeightPrevoted: 0,
				lastBlockID: lastBlock.header.id,
			});
		});

		it('should start transaction pool', () => {
			return expect(node['_transactionPool'].start).toHaveBeenCalled();
		});

		it('should start forging', () => {
			return expect(node['_startForging']).toHaveBeenCalled();
		});

		it('should subscribe to "app:network:ready" event', () => {
			return expect(node['_channel'].subscribe).toHaveBeenCalledWith(
				'app:network:ready',
				expect.any(Function),
			);
		});

		it('should subscribe to "app:network:event" event', () => {
			return expect(node['_channel'].subscribe).toHaveBeenCalledWith(
				'app:network:event',
				expect.any(Function),
			);
		});
	});

	describe('getSchema', () => {
		it('should return all schema with currently registered modules', () => {
			const schema = node.getSchema();
			expect(Object.keys(schema.account.properties)).toInclude('token');
			expect(Object.keys(schema.blockHeadersAssets).length).toBeGreaterThanOrEqual(2);
			expect(schema.block).not.toBeUndefined();
			expect(schema.blockHeader).not.toBeUndefined();
			expect(schema.transaction).not.toBeUndefined();
		});
	});

	describe('getRegisteredModules', () => {
		it('should return currently registered modules information', () => {
			const registeredModules = node.getRegisteredModules();
			expect(registeredModules).toHaveLength(1);
			expect(registeredModules[0].name).toEqual('token');
		});
	});

	describe('cleanup', () => {
		beforeEach(async () => {
			// Arrange
			await node.init({
				bus: createMockBus() as any,
				channel: stubs.channel,
				blockchainDB,
				forgerDB,
				nodeDB,
				logger: stubs.logger,
			});
			jest.spyOn(node['_transactionPool'], 'stop');
			jest.spyOn(node['_processor'], 'stop');
			jest.spyOn(node['_synchronizer'], 'stop');
			jest.spyOn(node['_networkModule'], 'cleanup');
		});

		it('should be an async function', () => {
			// Assert
			return expect(node.cleanup.constructor.name).toEqual('AsyncFunction');
		});

		it('should call stop for running tasks', async () => {
			await node.cleanup();
			// Assert
			expect(node['_transactionPool'].stop).toHaveBeenCalled();
			expect(node['_synchronizer'].stop).toHaveBeenCalled();
			expect(node['_processor'].stop).toHaveBeenCalled();
			expect(node['_networkModule'].cleanup).toHaveBeenCalled();
		});
	});

	describe('#_forgingTask', () => {
		beforeEach(async () => {
			await node.init({
				bus: createMockBus() as any,
				channel: stubs.channel,
				blockchainDB,
				forgerDB,
				nodeDB,
				logger: stubs.logger,
			});
			jest.spyOn(node['_forger'], 'delegatesEnabled').mockReturnValue(true);
			jest.spyOn(node['_forger'], 'forge');
			jest.spyOn(node['_synchronizer'], 'isActive', 'get').mockReturnValue(false);
		});

		it('should halt if no delegates are enabled', async () => {
			// Arrange
			(node['_forger'].delegatesEnabled as jest.Mock).mockReturnValue(false);

			// Act
			await node['_forgingTask']();

			// Assert
			expect(stubs.logger.trace).toHaveBeenNthCalledWith(1, 'No delegates are enabled');
			expect(node['_forger'].forge).not.toHaveBeenCalled();
		});

		it('should halt if the client is not ready to forge (is syncing)', async () => {
			// Arrange
			jest.spyOn(node['_synchronizer'], 'isActive', 'get').mockReturnValue(true);

			// Act
			await node['_forgingTask']();

			// Assert
			expect(stubs.logger.debug).toHaveBeenNthCalledWith(1, 'Client not ready to forge');
			expect(node['_forger'].forge).not.toHaveBeenCalled();
		});

		it('should execute forger.forge otherwise', async () => {
			await node['_forgingTask']();

			expect(node['_forger'].forge).toHaveBeenCalled();
		});
	});

	describe('#_startForging', () => {
		beforeEach(async () => {
			await node.init({
				bus: createMockBus() as any,
				channel: stubs.channel,
				blockchainDB,
				forgerDB,
				nodeDB,
				logger: stubs.logger,
			});
			jest.spyOn(node['_forger'], 'loadDelegates');
		});

		it('should load the delegates', async () => {
			await node['_startForging']();
			expect(node['_forger'].loadDelegates).toHaveBeenCalled();
		});

		it('should register a task in Jobs Queue named "nextForge" with a designated interval', async () => {
			await node['_startForging']();

			expect(node['_forgingJob']).not.toBeUndefined();
		});
	});
});
