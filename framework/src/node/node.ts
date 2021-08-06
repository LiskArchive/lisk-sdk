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
import { ModuleEndpointContext, RegisteredModule, RegisteredSchema } from '../types';
import { NodeOptions } from './types';
import { InMemoryChannel } from '../controller/channels';
import { Network } from './network';
import { BaseModule } from '../modules/base_module';
import { BaseCommand } from '../modules/base_command';
import { StateMachine } from './state_machine';
import {
	Consensus,
	ValidatorAPI,
	ValidatorModule,
	LiskBFTAPI,
	LiskBFTModule,
	EVENT_BLOCK_DELETE,
	EVENT_BLOCK_NEW,
} from './consensus';
import { Generator } from './generator';
import { Endpoint } from './endpoint';
import { getRegisteredModules, getSchema, isReservedEndpointFunction } from './utils/modules';

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
	private readonly _endpoint: Endpoint;
	private readonly _validatorModule: ValidatorModule;
	private readonly _liskBFTModule: LiskBFTModule;
	private _channel!: InMemoryChannel;
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
			channel: this._channel,
		});

		this._chain = new Chain({
			maxPayloadLength: this._options.genesisConfig.maxPayloadLength,
		});

		this._stateMachine = new StateMachine();
		this._validatorModule = new ValidatorModule();
		this._liskBFTModule = new LiskBFTModule();
		this._registeredModules.push(this._validatorModule, this._liskBFTModule);
		this._consensus = new Consensus({
			stateMachine: this._stateMachine,
			network: this._network,
			chain: this._chain,
			genesisConfig: this._options.genesisConfig,
			liskBFTAPI: this._liskBFTModule.api,
			validatorAPI: this._validatorModule.api,
		});
		this._generator = new Generator({
			chain: this._chain,
			consensus: this._consensus,
			liskBFTAPI: this._liskBFTModule.api,
			validatorAPI: this._validatorModule.api,
			generationConfig: this._options.generation,
			network: this._network,
			stateMachine: this._stateMachine,
			genesisConfig: this._options.genesisConfig,
		});
		this._endpoint = new Endpoint({
			options: this._options,
			chain: this._chain,
			consensus: this._consensus,
			generator: this._generator,
		});
		this._stateMachine.registerSystemModule(this._validatorModule);
		this._stateMachine.registerSystemModule(this._liskBFTModule);
		this._generator.registerModule(this._validatorModule);
		this._generator.registerModule(this._liskBFTModule);
	}

	public getEndpoints(): Record<string, (ctx: ModuleEndpointContext) => Promise<unknown>> {
		const endpoints: Record<string, (ctx: ModuleEndpointContext) => Promise<unknown>> = {};
		for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(this._endpoint))) {
			const val = this._endpoint[key];
			if (!isReservedEndpointFunction(key) && typeof val === 'function') {
				endpoints[`app_${key}`] = val.bind(this) as (
					ctx: ModuleEndpointContext,
				) => Promise<unknown>;
			}
		}
		for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(this._generator.endpoint))) {
			const val = this._generator.endpoint[key];
			if (!isReservedEndpointFunction(key) && typeof val === 'function') {
				endpoints[`app_${key}`] = val.bind(this) as (
					ctx: ModuleEndpointContext,
				) => Promise<unknown>;
			}
		}
		for (const mod of this._registeredModules) {
			for (const key of Object.keys(mod.endpoint)) {
				const val = mod.endpoint[key];
				if (!isReservedEndpointFunction(key) && typeof val === 'function') {
					endpoints[`${mod.name}_${key}`] = val.bind(mod) as (
						ctx: ModuleEndpointContext,
					) => Promise<unknown>;
				}
			}
		}
		return endpoints;
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

			if (typeof command.schema !== 'object') {
				throw new Error('Custom module contains command with invalid `schema` property.');
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
		channel,
		genesisBlock,
		blockchainDB,
		forgerDB,
		logger,
		nodeDB,
	}: NodeInitInput): Promise<void> {
		this._channel = channel;
		this._logger = logger;
		this._blockchainDB = blockchainDB;
		this._forgerDB = forgerDB;
		this._nodeDB = nodeDB;

		this._networkIdentifier = getNetworkIdentifier(
			genesisBlock.header.id,
			this._options.genesisConfig.communityIdentifier,
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

		this._consensus.events.on(EVENT_BLOCK_NEW, (block: Block) => {
			this._generator.onNewBlock(block);
		});
		this._consensus.events.on(EVENT_BLOCK_DELETE, (block: Block) => {
			this._generator.onDeleteBlock(block);
		});

		this._logger.info('Node ready and launched');
	}

	public get liskBFTAPI(): LiskBFTAPI {
		return this._liskBFTModule.api;
	}

	public get validatorAPI(): ValidatorAPI {
		return this._validatorModule.api;
	}

	public get networkIdentifier(): Buffer {
		return this._networkIdentifier;
	}

	public async start() {
		await this._network.start();
		await this._generator.start();
	}

	public async stop(): Promise<void> {
		this._logger.info('Node cleanup started');
		await this._network.stop();
		await this._generator.stop();
		await this._consensus.stop();
		this._logger.info('Node cleanup completed');
	}
}
