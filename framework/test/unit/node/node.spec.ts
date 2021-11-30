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
import { InMemoryKVStore, KVStore } from '@liskhq/lisk-db';
import {
	generatePrivateKey,
	getPublicKeyFromPrivateKey,
	getRandomBytes,
	blsPopProve,
	getAddressAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';
import { Node } from '../../../src/node/node';
import { nodeOptions } from '../../fixtures/node';
import { InMemoryChannel } from '../../../src/controller';
import { fakeLogger } from '../../utils/node';
import { BaseAPI, BaseCommand, BaseEndpoint, BaseModule } from '../../../src';
import { ModuleInitArgs } from '../../../src/modules/base_module';
import {
	CONSENSUS_EVENT_BLOCK_DELETE,
	CONSENSUS_EVENT_BLOCK_NEW,
} from '../../../src/node/consensus';
import { BFTAPI } from '../../../src/modules/bft';
import { GenesisBlockExecuteContext } from '../../../src/node/state_machine';
import { ValidatorsAPI } from '../../../src/modules/validators';

jest.mock('fs-extra');

class SampleEndpoint extends BaseEndpoint {
	public do() {}
}

class SampleNodeModule extends BaseModule {
	public endpoint = new SampleEndpoint(this.id);
	public api: BaseAPI = {} as never;
	public id = 1000;
	public name = 'sample';

	private _bftAPI!: BFTAPI;
	private _validatorAPI!: ValidatorsAPI;

	public async init(_args: ModuleInitArgs): Promise<void> {}

	public addDependencies(bftAPI: BFTAPI, validatorAPI: ValidatorsAPI) {
		this._bftAPI = bftAPI;
		this._validatorAPI = validatorAPI;
	}

	public async afterGenesisBlockExecute(context: GenesisBlockExecuteContext): Promise<void> {
		const keys = getAddressAndPublicKeyFromPassphrase('passphrase');
		const blsSK = generatePrivateKey(getRandomBytes(64));
		const blsPK = getPublicKeyFromPrivateKey(blsSK);
		const blsPop = blsPopProve(blsSK);
		await this._validatorAPI.registerValidatorKeys(
			context.getAPIContext(),
			keys.address,
			blsPK,
			keys.publicKey,
			blsPop,
		);
		await this._bftAPI.setBFTParameters(context.getAPIContext(), BigInt(68), BigInt(68), [
			{ address: keys.address, bftWeight: BigInt(100) },
		]);
	}
}

describe('Node', () => {
	let node: Node;
	let subscribedEvents: any;
	let channel: InMemoryChannel;
	let blockchainDB: KVStore;
	let forgerDB: KVStore;
	let nodeDB: KVStore;
	let sampleNodeModule: SampleNodeModule;

	beforeEach(() => {
		// Arrange
		subscribedEvents = {};

		blockchainDB = new InMemoryKVStore() as never;
		forgerDB = new InMemoryKVStore() as never;
		nodeDB = new InMemoryKVStore() as never;

		/* Arranging Stubs start */

		channel = {
			invoke: jest.fn(),
			subscribe: jest.fn((event, cb) => {
				subscribedEvents[event] = cb;
			}),
			once: jest.fn(),
			registerToBus: jest.fn(),
		} as never;

		node = new Node({
			options: nodeOptions,
		});
		sampleNodeModule = new SampleNodeModule();
		sampleNodeModule.addDependencies(node.bftAPI, node.validatorAPI);
		node.registerModule(sampleNodeModule);
	});

	describe('constructor', () => {
		it('should successfully create all instance', () => {
			expect(node['_network']).toBeDefined();
			expect(node['_chain']).toBeDefined();
			expect(node['_stateMachine']).toBeDefined();
			expect(node['_validatorsModule']).toBeDefined();
			expect(node['_bftModule']).toBeDefined();
			expect(node['_consensus']).toBeDefined();
			expect(node['_generator']).toBeDefined();
			expect(node['_endpoint']).toBeDefined();
		});

		it('should register system modules to state machine and generator', () => {
			expect(node['_registeredModules']).toHaveLength(3);
			expect(node['_stateMachine']['_systemModules']).toHaveLength(2);
			expect(node['_stateMachine']['_modules']).toHaveLength(1);
			expect(node['_generator']['_modules']).toHaveLength(3);
		});
	});

	describe('init', () => {
		beforeEach(async () => {
			// Act
			jest.spyOn(node['_chain'], 'genesisBlockExist').mockResolvedValue(true);
			jest.spyOn(node['_chain'], 'loadLastBlocks').mockResolvedValue();
			jest.spyOn(node['_network'], 'init');
			jest.spyOn(node['_generator'], 'init');
			jest.spyOn(node['_consensus'], 'init');
			jest.spyOn(node['_consensus'].events, 'on');
			jest.spyOn(sampleNodeModule, 'init');
			const genesisBlock = await node.generateGenesisBlock({ assets: [] });
			await node.init({
				channel,
				blockchainDB,
				forgerDB,
				nodeDB,
				logger: fakeLogger,
				genesisBlock,
			});
		});

		it('should initialize network', () => {
			expect(node['_network'].init).toHaveBeenCalledTimes(1);
		});

		it('should initialize consensus', () => {
			expect(node['_consensus'].init).toHaveBeenCalledTimes(1);
		});

		it('should initialize generator', () => {
			expect(node['_generator'].init).toHaveBeenCalledTimes(1);
		});

		it('should initialize all register modules', () => {
			expect(sampleNodeModule.init).toHaveBeenCalledTimes(1);
		});

		it('should register consensus event handler', () => {
			expect(node['_consensus'].events.on).toHaveBeenCalledWith(
				CONSENSUS_EVENT_BLOCK_NEW,
				expect.anything(),
			);
			expect(node['_consensus'].events.on).toHaveBeenCalledWith(
				CONSENSUS_EVENT_BLOCK_DELETE,
				expect.anything(),
			);
		});
	});

	describe('getRegisteredModules', () => {
		// eslint-disable-next-line jest/expect-expect
		it('should return currently registered modules information', () => {});
	});

	describe('getEndpoints', () => {
		let endpoints: Record<string, unknown>;
		beforeEach(() => {
			endpoints = node.getEndpoints();
		});

		it('should not change the exposed endpoints unintentionally', () => {
			expect(Object.keys(endpoints)).toMatchSnapshot();
		});

		it('should return generator endpoint', () => {
			expect(endpoints).toHaveProperty('postTransaction');
		});

		it('should return all node endpoints', () => {
			expect(endpoints).toHaveProperty('getBlockByID');
		});

		it('should return all module endpoints', () => {
			const moduleEndpoints = node.getModuleEndpoints();

			expect(moduleEndpoints).toHaveProperty('sample');
			expect(moduleEndpoints['sample']).toHaveProperty('do');
		});
	});

	describe('getSchema', () => {
		it('should return schema for defaults and all registered modules', () => {
			const schema = node.getSchema();
			expect(schema.block).not.toBeEmpty();
			expect(schema.blockHeader).not.toBeEmpty();
			expect(schema.transaction).not.toBeEmpty();
			expect(schema.commands).toBeEmpty();
		});
	});

	describe('registerModule', () => {
		let sampleModule: SampleNodeModule;

		beforeEach(() => {
			sampleModule = new SampleNodeModule();
			sampleModule.id = 1024;
			sampleModule.name = 'sample2';
		});

		it('should throw an error if id is less than 2 when registering a module', () => {
			// Arrange
			// Act
			sampleModule.id = 1;
			// Assert
			expect(() => node.registerModule(sampleModule)).toThrow(
				'Custom module must have id greater than 2',
			);
		});

		it('should throw an error if module id is missing', () => {
			// Act
			sampleModule.id = undefined as never;
			// Assert
			expect(() => node.registerModule(sampleModule)).toThrow(
				"Custom module 'SampleNodeModule' is missing either one or both of the required properties: 'id', 'name'.",
			);
		});

		it('should throw an error if module name is missing', () => {
			// Act
			sampleModule.name = '';
			// Assert
			expect(() => node.registerModule(sampleModule)).toThrow(
				"Custom module 'SampleNodeModule' is missing either one or both of the required properties: 'id', 'name'.",
			);
		});

		it('should throw an error if command does not extend BaseCommand', () => {
			// Act
			class SampleCommand {
				public name = 'asset';
				public id = 0;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				public async execute(): Promise<void> {}
			}
			sampleModule.name = 'SampleModule';
			sampleModule.id = 999999;
			sampleModule.commands.push(new SampleCommand() as any);
			// Assert
			expect(() => node.registerModule(sampleModule)).toThrow(
				'Custom module contains command which does not extend `BaseCommand` class.',
			);
		});

		it('should throw an error if command id is invalid', () => {
			// Act
			class SampleCommand extends BaseCommand {
				public name = 'asset';
				public id = null as any;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				public async execute(): Promise<void> {}
			}
			sampleModule.name = 'SampleModule';
			sampleModule.id = 999999;
			sampleModule.commands.push(new SampleCommand(sampleModule.id));
			// Assert
			expect(() => node.registerModule(sampleModule)).toThrow(
				'Custom module contains command with invalid `id` property.',
			);
		});

		it('should throw an error if command name is invalid', () => {
			// Act
			class SampleCommand extends BaseCommand {
				public name = '';
				public id = 0;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				public async execute(): Promise<void> {}
			}
			sampleModule.name = 'SampleModule';
			sampleModule.id = 999999;
			sampleModule.commands.push(new SampleCommand(sampleModule.id));
			// Assert
			expect(() => node.registerModule(sampleModule)).toThrow(
				'Custom module contains command with invalid `name` property.',
			);
		});

		it('should throw an error if command execute is invalid', () => {
			// Act
			class SampleCommand extends BaseCommand {
				public name = 'asset';
				public id = 0;
				public schema = {
					$id: 'lisk/sample',
					type: 'object',
					properties: {},
				};
				public execute = {} as any;
			}
			sampleModule.name = 'SampleModule';
			sampleModule.id = 999999;
			sampleModule.commands.push(new SampleCommand(sampleModule.id));
			// Assert
			expect(() => node.registerModule(sampleModule)).toThrow(
				'Custom module contains command with invalid `execute` property.',
			);
		});

		it('should add custom module to collection.', () => {
			// Act
			node.registerModule(sampleModule);

			// Assert
			expect(node['_registeredModules']).toHaveLength(4);
		});
	});

	describe('start', () => {
		beforeEach(async () => {
			// Arrange
			jest.spyOn(node['_chain'], 'genesisBlockExist').mockResolvedValue(true);
			jest.spyOn(node['_chain'], 'loadLastBlocks').mockResolvedValue();
			jest.spyOn(node['_network'], 'start');
			jest.spyOn(node['_generator'], 'start');
			const genesisBlock = await node.generateGenesisBlock({ assets: [] });
			await node.init({
				channel,
				blockchainDB,
				forgerDB,
				nodeDB,
				logger: fakeLogger,
				genesisBlock,
			});
		});

		it('should call start for network and generator', async () => {
			await node.start();
			expect(node['_network'].start).toHaveBeenCalledTimes(1);
			expect(node['_generator'].start).toHaveBeenCalledTimes(1);
		});
	});
});
