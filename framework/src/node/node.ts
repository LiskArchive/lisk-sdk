/*
 * Copyright © 2019 Lisk Foundation
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

import { Chain, Block } from '@liskhq/lisk-chain';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { KVStore } from '@liskhq/lisk-db';
import { Logger } from '../logger';
import { RegisteredModule, RegisteredSchema } from '../types';
import { NodeOptions } from './types';
import { InMemoryChannel } from '../controller/channels';
import { Network } from './network';
import { BaseModule } from '../modules/base_module';
import { BaseCommand } from '../modules/base_command';
import { StateMachine } from '../state_machine';
import { Consensus, CONSENSUS_EVENT_BLOCK_DELETE, CONSENSUS_EVENT_BLOCK_NEW } from './consensus';
import { BlockGenerateInput, Generator, GenesisBlockGenerateInput } from './generator';
import { getRegisteredModules, getSchema } from './utils/modules';
import { getEndpointHandlers } from '../endpoint';
import { ValidatorsAPI, ValidatorsModule } from '../modules/validators';
import { BFTAPI, BFTModule } from './bft';
import { APP_EVENT_BLOCK_DELETE, APP_EVENT_BLOCK_NEW } from './events';
import { NotFoundHandler, RPCServer } from './rpc/rpc_server';
import { ChainEndpoint } from './endpoint/chain';
import { SystemEndpoint } from './endpoint/system';

const MINIMUM_MODULE_ID = 2;

interface NodeConstructor {
	readonly options: NodeOptions;
}

interface NodeInitInput {
	readonly logger: Logger;
	readonly genesisBlock: Block;
	readonly channel: InMemoryChannel;
	readonly forgerDB: KVStore;
	readonly blockchainDB: KVStore;
	readonly nodeDB: KVStore;
}

export class Node {
	private readonly _options: NodeOptions;
	private readonly _registeredModules: BaseModule[] = [];
	private readonly _stateMachine: StateMachine;
	private readonly _consensus: Consensus;
	private readonly _generator: Generator;
	private readonly _network: Network;
	private readonly _chain: Chain;
	private readonly _validatorsModule: ValidatorsModule;
	private readonly _bftModule: BFTModule;
	private readonly _rpcServer: RPCServer;
	private _logger!: Logger;
	private _nodeDB!: KVStore;
	private _forgerDB!: KVStore;
	private _blockchainDB!: KVStore;
	private _networkIdentifier!: Buffer;

	public constructor({ options }: NodeConstructor) {
		this._options = options;
		this._network = new Network({
			networkVersion: this._options.networkVersion,
			options: this._options.network,
		});

		this._chain = new Chain({
			maxTransactionsSize: this._options.genesis.maxTransactionsSize,
			keepEventsForHeights: this._options.system.keepEventsForHeights,
		});

		this._stateMachine = new StateMachine();
		this._validatorsModule = new ValidatorsModule();
		this._bftModule = new BFTModule();
		this._registeredModules.push(this._validatorsModule, this._bftModule);
		this._consensus = new Consensus({
			stateMachine: this._stateMachine,
			network: this._network,
			chain: this._chain,
			genesisConfig: this._options.genesis,
			bftAPI: this._bftModule.api,
		});
		this._generator = new Generator({
			chain: this._chain,
			consensus: this._consensus,
			bftAPI: this._bftModule.api,
			generationConfig: this._options.generation,
			network: this._network,
			stateMachine: this._stateMachine,
			genesisConfig: this._options.genesis,
		});
		this._stateMachine.registerSystemModule(this._validatorsModule);
		this._stateMachine.registerSystemModule(this._bftModule);
		this._generator.registerModule(this._validatorsModule);
		this._generator.registerModule(this._bftModule);
		this._rpcServer = new RPCServer(options.rpc);
	}

	public getSchema(): RegisteredSchema {
		return getSchema(this._registeredModules);
	}

	public getRegisteredModules(): RegisteredModule[] {
		return getRegisteredModules(this._registeredModules);
	}

	public registerModule(customModule: BaseModule): void {
		const exist = this._registeredModules.find(rm => rm.id === customModule.id);
		if (exist) {
			throw new Error(`Custom module with id ${customModule.id} already exists.`);
		}

		if (!customModule.name || !customModule.id) {
			throw new Error(
				`Custom module '${customModule.constructor.name}' is missing either one or both of the required properties: 'id', 'name'.`,
			);
		}

		if (customModule.id < MINIMUM_MODULE_ID) {
			throw new Error(`Custom module must have id greater than ${MINIMUM_MODULE_ID}.`);
		}

		for (const command of customModule.commands) {
			if (!(command instanceof BaseCommand)) {
				throw new Error(
					'Custom module contains command which does not extend `BaseCommand` class.',
				);
			}

			if (typeof command.name !== 'string' || command.name === '') {
				throw new Error('Custom module contains command with invalid `name` property.');
			}

			if (typeof command.id !== 'number') {
				throw new Error('Custom module contains command with invalid `id` property.');
			}

			if (typeof command.execute !== 'function') {
				throw new Error('Custom module contains command with invalid `execute` property.');
			}
		}

		this._stateMachine.registerModule(customModule);
		this._generator.registerModule(customModule);
		this._registeredModules.push(customModule);
	}

	public async init({
		genesisBlock,
		blockchainDB,
		forgerDB,
		logger,
		nodeDB,
	}: NodeInitInput): Promise<void> {
		this._logger = logger;
		this._blockchainDB = blockchainDB;
		this._forgerDB = forgerDB;
		this._nodeDB = nodeDB;

		this._networkIdentifier = getNetworkIdentifier(
			genesisBlock.header.id,
			this._options.genesis.communityIdentifier,
		);
		this._chain.init({
			db: this._blockchainDB,
			networkIdentifier: this._networkIdentifier,
			genesisBlock,
		});

		await this._network.init({
			nodeDB: this._nodeDB,
			logger: this._logger,
			networkIdentifier: this._networkIdentifier,
		});
		for (const mod of this._registeredModules) {
			const { modules, ...remainingGenesisConfig } = this._options.genesis;
			if (mod.init) {
				await mod.init({
					moduleConfig: this._options.genesis.modules[mod.name],
					generatorConfig: this._options.generation.modules[mod.name],
					genesisConfig: remainingGenesisConfig,
				});
			}
		}
		await this._consensus.init({
			db: this._blockchainDB,
			genesisBlock,
			logger: this._logger,
		});

		await this._generator.init({
			blockchainDB: this._blockchainDB,
			generatorDB: this._forgerDB,
			logger: this._logger,
		});

		this._consensus.events.on(CONSENSUS_EVENT_BLOCK_NEW, (block: Block) => {
			this._generator.onNewBlock(block);
			this._rpcServer.publish(APP_EVENT_BLOCK_NEW, { block: block.getBytes().toString('hex') });
		});
		this._consensus.events.on(CONSENSUS_EVENT_BLOCK_DELETE, (block: Block) => {
			this._generator.onDeleteBlock(block);
			this._rpcServer.publish(APP_EVENT_BLOCK_DELETE, { block: block.getBytes().toString('hex') });
		});

		this._rpcServer.init({
			logger: this._logger,
			networkIdentifier: this._chain.networkIdentifier,
		});
		const chainEndpoint = new ChainEndpoint({
			chain: this._chain,
		});
		const systemEndpoint = new SystemEndpoint({
			chain: this._chain,
			consensus: this._consensus,
			generator: this._generator,
			registeredModules: this._registeredModules,
			options: this._options,
		});

		for (const [name, handler] of Object.entries(getEndpointHandlers(chainEndpoint))) {
			this._rpcServer.registerEndpoint('chain', name, handler);
		}
		for (const [name, handler] of Object.entries(getEndpointHandlers(systemEndpoint))) {
			this._rpcServer.registerEndpoint('system', name, handler);
		}
		for (const [name, handler] of Object.entries(getEndpointHandlers(this._generator.endpoint))) {
			this._rpcServer.registerEndpoint('endpoint', name, handler);
		}

		this._logger.info('Node ready and launched');
	}

	public async generateGenesisBlock(input: GenesisBlockGenerateInput): Promise<Block> {
		for (const mod of this._registeredModules) {
			const { modules, ...remainingGenesisConfig } = this._options.genesis;
			if (mod.init) {
				await mod.init({
					moduleConfig: this._options.genesis.modules[mod.name],
					generatorConfig: this._options.generation.modules[mod.name],
					genesisConfig: remainingGenesisConfig,
				});
			}
		}
		return this._generator.generateGenesisBlock(input);
	}

	public async generateBlock(input: BlockGenerateInput): Promise<Block> {
		return this._generator.generateBlock(input);
	}

	public registerNotFoundHandler(handler: NotFoundHandler): void {
		this._rpcServer.registerNotFoundEndpoint(handler);
	}

	public get bftAPI(): BFTAPI {
		return this._bftModule.api;
	}

	public get validatorAPI(): ValidatorsAPI {
		return this._validatorsModule.api;
	}

	public get networkIdentifier(): Buffer {
		return this._networkIdentifier;
	}

	public async start() {
		await this._network.start();
		await this._generator.start();
		await this._consensus.start();
		await this._rpcServer.start();
	}

	public async stop(): Promise<void> {
		this._logger.info('Node cleanup started');
		await this._network.stop();
		await this._generator.stop();
		await this._consensus.stop();
		this._rpcServer.stop();
		this._logger.info('Node cleanup completed');
	}
}
