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
import { Chain } from '@liskhq/lisk-chain';
import { bls, legacy, encrypt } from '@liskhq/lisk-cryptography';
import { InMemoryDatabase, Database } from '@liskhq/lisk-db';
import { codec } from '@liskhq/lisk-codec';
import { Engine } from '../../../src/engine/engine';
import {
	Consensus,
	CONSENSUS_EVENT_BLOCK_DELETE,
	CONSENSUS_EVENT_BLOCK_NEW,
	CONSENSUS_EVENT_FORK_DETECTED,
} from '../../../src/engine/consensus';
import { ABI } from '../../../src/abi';
import { genesisBlock } from '../../fixtures';
import * as logger from '../../../src/logger';
import { fakeLogger } from '../../utils/mocks';
import { BFTAPI } from '../../../src/engine/bft/api';
import { Network } from '../../../src/engine/network';
import { Generator } from '../../../src/engine/generator';
import { RPCServer } from '../../../src/engine/rpc/rpc_server';
import {
	CONSENSUS_EVENT_NETWORK_BLOCK_NEW,
	CONSENSUS_EVENT_VALIDATORS_CHANGED,
} from '../../../src/engine/consensus/constants';
import * as genesisDelegates from '../../fixtures/genesis_delegates.json';
import { GENERATOR_STORE_KEY_PREFIX } from '../../../src/engine/generator/constants';
import {
	plainGeneratorKeysSchema,
	generatorKeysSchema,
} from '../../../src/engine/generator/schemas';

jest.mock('fs-extra');
jest.mock('@liskhq/lisk-db');

describe('engine', () => {
	let engine: Engine;
	let abi: ABI;
	let generatorDB: Database;

	beforeEach(async () => {
		generatorDB = new InMemoryDatabase() as never;
		for (const d of genesisDelegates.delegates) {
			const passphrase = await encrypt.decryptMessageWithPassword(
				encrypt.parseEncryptedMessage(d.encryptedPassphrase),
				d.password,
				'utf-8',
			);
			const keypair = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase);
			const blsSK = bls.generatePrivateKey(Buffer.from(passphrase, 'utf-8'));
			const generatorKeys = {
				address: Buffer.from(d.address, 'hex'),
				type: 'plain',
				data: {
					generatorKey: keypair.publicKey,
					generatorPrivateKey: keypair.privateKey,
					blsPrivateKey: blsSK,
					blsKey: bls.getPublicKeyFromPrivateKey(blsSK),
				},
			};
			const encodedData = codec.encode(plainGeneratorKeysSchema, generatorKeys.data);

			await generatorDB.set(
				Buffer.concat([GENERATOR_STORE_KEY_PREFIX, generatorKeys.address]),
				codec.encode(generatorKeysSchema, {
					type: generatorKeys.type,
					data: encodedData,
				}),
			);
		}

		abi = {
			init: jest.fn().mockResolvedValue({
				config: {
					system: {
						dataPath: `/home/lisk/.lisk-test`,
					},
					rpc: {
						modes: [],
					},
					logger: {
						consoleLogLevel: 'debug',
						fileLogLevel: '',
					},
					genesis: {
						communityIdentifier: 'Lisk',
					},
					network: {
						port: '7887',
						seedPeers: [],
						fixedPeers: [],
						whitelistedPeers: [],
						blacklistedIPs: [],
						maxOutboundConnections: 0,
						maxInboundConnections: 0,
						advertiseAddress: false,
					},
					txpool: {},
				},
				genesisBlock: {
					header: genesisBlock().header,
					assets: [],
					transactions: [],
				},
				registeredModules: [],
			}),
			ready: jest.fn(),
		} as never;
		jest.spyOn(logger, 'createLogger').mockReturnValue(fakeLogger);
		jest.spyOn(Chain.prototype, 'genesisBlockExist').mockResolvedValue(true);
		jest.spyOn(Chain.prototype, 'loadLastBlocks').mockResolvedValue(undefined);
		jest
			.spyOn(Chain.prototype, 'lastBlock', 'get')
			.mockReturnValue({ header: { height: 300 } } as never);
		jest.spyOn(Consensus.prototype, 'getMaxRemovalHeight').mockResolvedValue(0);
		jest
			.spyOn(BFTAPI.prototype, 'getBFTHeights')
			.mockResolvedValue({ maxHeightPrecommitted: 0 } as never);
		jest.spyOn(Network.prototype, 'init');
		jest.spyOn(Network.prototype, 'start');
		jest.spyOn(Network.prototype, 'stop');
		jest.spyOn(Consensus.prototype, 'init');
		jest.spyOn(Consensus.prototype, 'start');
		jest.spyOn(Consensus.prototype, 'stop');
		jest.spyOn(Generator.prototype, 'init');
		jest.spyOn(Generator.prototype, 'start');
		jest.spyOn(Generator.prototype, 'stop');
		jest.spyOn(RPCServer.prototype, 'init');
		jest.spyOn(RPCServer.prototype, 'start');
		jest.spyOn(RPCServer.prototype, 'stop');
		jest.spyOn(RPCServer.prototype, 'registerEndpoint');
		jest.spyOn(RPCServer.prototype, 'registerNotFoundEndpoint');

		engine = new Engine(abi);
		engine['_generatorDB'] = generatorDB;
	});

	describe('start', () => {
		beforeEach(async () => {
			// Arrange
			await engine.start();
		});

		it('should initialize logger', () => {
			expect(logger.createLogger).toHaveBeenCalledWith({
				module: 'engine',
				fileLogLevel: 'info',
				consoleLogLevel: 'debug',
				logFilePath: `/home/lisk/.lisk-test/logs/engine.log`,
			});
		});

		it('should initialize and start network', () => {
			expect(Network.prototype.init).toHaveBeenCalledTimes(1);
			expect(Network.prototype.start).toHaveBeenCalledTimes(1);
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
			expect(engine['_consensus'].events.eventNames()).toHaveLength(6);
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
