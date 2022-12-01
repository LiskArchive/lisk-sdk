/* eslint-disable max-classes-per-file */
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
import { Block, BlockAssets, Chain } from '@liskhq/lisk-chain';
import { jobHandlers } from '@liskhq/lisk-utils';
import { Engine } from '../../../src/engine/engine';
import {
	Consensus,
	CONSENSUS_EVENT_BLOCK_DELETE,
	CONSENSUS_EVENT_BLOCK_NEW,
	CONSENSUS_EVENT_FORK_DETECTED,
} from '../../../src/engine/consensus';
import { ABI } from '../../../src/abi';
import * as logger from '../../../src/logger';
import { fakeLogger } from '../../utils/mocks';
import { BFTMethod } from '../../../src/engine/bft/method';
import { Network } from '../../../src/engine/network';
import { Generator } from '../../../src/engine/generator';
import { RPCServer } from '../../../src/engine/rpc/rpc_server';
import {
	CONSENSUS_EVENT_NETWORK_BLOCK_NEW,
	CONSENSUS_EVENT_VALIDATORS_CHANGED,
} from '../../../src/engine/consensus/constants';
import { defaultConfig } from '../../../src/testing/fixtures';
import { createFakeBlockHeader } from '../../fixtures';
import { LegacyChainHandler } from '../../../src/engine/legacy/legacy_chain_handler';

jest.mock('fs-extra');
jest.mock('@liskhq/lisk-db');

describe('engine', () => {
	let engine: Engine;
	let abi: ABI;

	beforeEach(() => {
		abi = {
			init: jest.fn(),
		} as never;
		jest.spyOn(logger, 'createLogger').mockReturnValue(fakeLogger);
		jest.spyOn(Chain.prototype, 'genesisBlockExist').mockResolvedValue(true);
		jest.spyOn(Chain.prototype, 'loadLastBlocks').mockResolvedValue(undefined);
		jest
			.spyOn(Chain.prototype, 'lastBlock', 'get')
			.mockReturnValue({ header: { height: 300 } } as never);
		jest.spyOn(Consensus.prototype, 'getMaxRemovalHeight').mockResolvedValue(0);
		jest
			.spyOn(BFTMethod.prototype, 'getBFTHeights')
			.mockResolvedValue({ maxHeightPrecommitted: 0 } as never);
		jest.spyOn(Network.prototype, 'init').mockResolvedValue();
		jest.spyOn(Network.prototype, 'start').mockResolvedValue();
		jest.spyOn(Network.prototype, 'stop').mockResolvedValue();
		jest.spyOn(LegacyChainHandler.prototype, 'init');
		jest.spyOn(LegacyChainHandler.prototype, 'sync').mockResolvedValue();
		jest.spyOn(Consensus.prototype, 'init');
		jest.spyOn(Consensus.prototype, 'start').mockResolvedValue();
		jest.spyOn(Consensus.prototype, 'stop');
		jest.spyOn(Generator.prototype, 'start').mockResolvedValue();
		jest.spyOn(Generator.prototype, 'stop').mockResolvedValue();
		jest.spyOn(RPCServer.prototype, 'init');
		jest.spyOn(RPCServer.prototype, 'start').mockResolvedValue();
		jest.spyOn(RPCServer.prototype, 'stop').mockReturnValue();
		jest.spyOn(RPCServer.prototype, 'registerEndpoint');
		jest.spyOn(RPCServer.prototype, 'registerNotFoundEndpoint');
		jest.spyOn(Generator.prototype, 'init').mockResolvedValue(); // init tested via generator.spec
		jest.spyOn(jobHandlers.Scheduler.prototype, 'start').mockResolvedValue();

		engine = new Engine(abi, {
			...defaultConfig,
			genesis: {
				...defaultConfig.genesis,
				block: {
					blob: new Block(createFakeBlockHeader(), [], new BlockAssets())
						.getBytes()
						.toString('hex'),
				},
			},
		});
		engine['_chainID'] = Buffer.from('100000000', 'hex');
	});

	describe('start', () => {
		beforeEach(async () => {
			// Arrange
			await engine.start();
		});

		it('should initialize logger', () => {
			expect(logger.createLogger).toHaveBeenCalledWith({
				name: 'engine',
				logLevel: 'none',
			});
		});

		it('should initialize and start network', () => {
			expect(Network.prototype.init).toHaveBeenCalledTimes(1);
			expect(Network.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should initialize legacy chain handler but not start syncing blocks if config is set to false', () => {
			expect(LegacyChainHandler.prototype.init).toHaveBeenCalledTimes(1);
			expect(LegacyChainHandler.prototype.sync).toHaveBeenCalledTimes(0);
		});

		it('should initialize legacy chain handler and start syncing blocks if config is set to true', async () => {
			await engine.stop();
			engine = new Engine(abi, {
				...defaultConfig,
				genesis: {
					...defaultConfig.genesis,
					block: {
						blob: new Block(createFakeBlockHeader(), [], new BlockAssets())
							.getBytes()
							.toString('hex'),
					},
				},
				legacy: {
					sync: true,
					brackets: [],
				},
			});
			engine['_chainID'] = Buffer.from('100000000', 'hex');
			await engine.start();

			expect(LegacyChainHandler.prototype.init).toHaveBeenCalledTimes(2);
			expect(LegacyChainHandler.prototype.sync).toHaveBeenCalledTimes(1);
		});

		it('should initialize and start consensus', () => {
			expect(Consensus.prototype.init).toHaveBeenCalledTimes(1);
			expect(Consensus.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should initialize and start generator', () => {
			expect(Generator.prototype.init).toHaveBeenCalledTimes(1);
			expect(Generator.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should initialize and start rpc server', () => {
			expect(RPCServer.prototype.init).toHaveBeenCalledTimes(1);
			expect(RPCServer.prototype.start).toHaveBeenCalledTimes(1);
		});

		it('should register consensus event handler', () => {
			expect(engine['_consensus'].events.eventNames()).toHaveLength(5);
			expect(engine['_consensus'].events.eventNames()).toContain(CONSENSUS_EVENT_BLOCK_DELETE);
			expect(engine['_consensus'].events.eventNames()).toContain(CONSENSUS_EVENT_BLOCK_NEW);
			expect(engine['_consensus'].events.eventNames()).toContain(CONSENSUS_EVENT_FORK_DETECTED);
			expect(engine['_consensus'].events.eventNames()).toContain(
				CONSENSUS_EVENT_VALIDATORS_CHANGED,
			);
			expect(engine['_consensus'].events.eventNames()).toContain(CONSENSUS_EVENT_NETWORK_BLOCK_NEW);
		});

		it('should register endpoints', () => {
			expect(engine['_rpcServer'].registerEndpoint).toHaveBeenCalledWith(
				'chain',
				expect.any(String),
				expect.any(Function),
			);
			expect(engine['_rpcServer'].registerEndpoint).toHaveBeenCalledWith(
				'system',
				expect.any(String),
				expect.any(Function),
			);
			expect(engine['_rpcServer'].registerEndpoint).toHaveBeenCalledWith(
				'generator',
				expect.any(String),
				expect.any(Function),
			);
			expect(engine['_rpcServer'].registerNotFoundEndpoint).toHaveBeenCalledWith(
				expect.any(Function),
			);
		});
	});

	describe('stop', () => {
		beforeEach(async () => {
			// Arrange
			await engine.start();
			await engine.stop();
		});

		it('should stop network', () => {
			expect(Network.prototype.stop).toHaveBeenCalledTimes(1);
		});

		it('should stop consensus', () => {
			expect(Consensus.prototype.stop).toHaveBeenCalledTimes(1);
		});

		it('should stop generator', () => {
			expect(Generator.prototype.stop).toHaveBeenCalledTimes(1);
		});

		it('should stop rpc server', () => {
			expect(RPCServer.prototype.stop).toHaveBeenCalledTimes(1);
		});
	});
});
