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
import * as path from 'path';
import { Chain, Block, BlockHeader, BlockAssets } from '@liskhq/lisk-chain';
import { getNetworkIdentifier } from '@liskhq/lisk-cryptography';
import { KVStore } from '@liskhq/lisk-db';
import { createLogger, Logger } from '../logger';
import { Network } from './network';
import { Consensus, CONSENSUS_EVENT_BLOCK_DELETE, CONSENSUS_EVENT_BLOCK_NEW } from './consensus';
import { BlockGenerateInput, Generator } from './generator';
import { getEndpointHandlers } from '../endpoint';
import { BFTModule } from './bft';
import { APP_EVENT_BLOCK_DELETE, APP_EVENT_BLOCK_NEW } from './events';
import { RPCServer, RequestContext } from './rpc/rpc_server';
import { ChainEndpoint } from './endpoint/chain';
import { SystemEndpoint } from './endpoint/system';
import { ABI, InitResponse } from '../abi';

const isEmpty = (value: unknown): boolean => {
	switch (typeof value) {
		case 'undefined':
			return true;
		case 'string':
			return value === '';
		case 'number':
			return value === 0;
		case 'bigint':
			return value === BigInt(0);
		case 'object':
			if (value === null) {
				return true;
			}
			if (Array.isArray(value) && value.length === 0) {
				return true;
			}
			if (Object.keys(value).length === 0) {
				return true;
			}
			return false;
		default:
			throw new Error('Unknown type.');
	}
};

const emptyOrDefault = <T>(value: T, defaultValue: T): T => (isEmpty(value) ? defaultValue : value);

export class Engine {
	private readonly _abi: ABI;
	private _config!: InitResponse['config'];
	private _consensus!: Consensus;
	private _generator!: Generator;
	private _network!: Network;
	private _chain!: Chain;
	private _bftModule!: BFTModule;
	private _rpcServer!: RPCServer;
	private _logger!: Logger;
	private _nodeDB!: KVStore;
	private _generatorDB!: KVStore;
	private _blockchainDB!: KVStore;
	private _networkIdentifier!: Buffer;

	public constructor(abi: ABI) {
		this._abi = abi;
	}

	public async generateBlock(input: BlockGenerateInput): Promise<Block> {
		return this._generator.generateBlock(input);
	}

	public async start() {
		await this._init();
		await this._network.start();
		await this._generator.start();
		await this._consensus.start();
		await this._rpcServer.start();
		this._logger.info('Engine starting');
	}

	public async stop(): Promise<void> {
		this._logger.info('Engine cleanup started');
		await this._network.stop();
		await this._generator.stop();
		await this._consensus.stop();
		this._rpcServer.stop();
		await this._closeDB();
		this._logger.info('Engine cleanup completed');
	}

	private async _init(): Promise<void> {
		const { config, genesisBlock, registeredModules } = await this._abi.init({});
		this._config = config;
		this._logger = createLogger({
			module: 'engine',
			fileLogLevel: emptyOrDefault(config.logger.fileLogLevel, 'info'),
			consoleLogLevel: emptyOrDefault(config.logger.consoleLogLevel, 'info'),
			logFilePath: path.join(config.system.dataPath, 'logs', 'engine.log'),
		});
		this._logger.info('Engine initialization starting');
		this._network = new Network({
			networkVersion: this._config.system.networkVersion,
			options: this._config.network,
		});

		this._chain = new Chain({
			maxTransactionsSize: this._config.genesis.maxTransactionsSize,
			keepEventsForHeights: this._config.system.keepEventsForHeights,
		});

		this._bftModule = new BFTModule();
		this._consensus = new Consensus({
			abi: this._abi,
			network: this._network,
			chain: this._chain,
			genesisConfig: {
				...this._config.genesis,
				modules: {},
				baseFees: [],
			},
			bft: this._bftModule,
		});
		this._generator = new Generator({
			abi: this._abi,
			chain: this._chain,
			consensus: this._consensus,
			bft: this._bftModule,
			generationConfig: {
				...this._config.generator,
				waitThreshold: this._config.genesis.blockTime / 5,
				generators: this._config.generator.keys,
			},
			network: this._network,
			genesisConfig: {
				...this._config.genesis,
				baseFees: [],
				modules: {},
			},
		});
		this._rpcServer = new RPCServer({
			...this._config.rpc,
			ws: {
				...this._config.rpc.ws,
				path: '/rpc',
			},
		});

		const genesis = new Block(
			new BlockHeader(genesisBlock.header),
			[],
			new BlockAssets(genesisBlock.assets),
		);

		this._blockchainDB = new KVStore(
			path.join(this._config.system.dataPath, 'data', 'blockchain.db'),
		);
		this._generatorDB = new KVStore(
			path.join(this._config.system.dataPath, 'data', 'generator.db'),
		);
		this._nodeDB = new KVStore(path.join(this._config.system.dataPath, 'data', 'node.db'));

		this._networkIdentifier = getNetworkIdentifier(
			genesis.header.id,
			this._config.genesis.communityIdentifier,
		);
		this._chain.init({
			db: this._blockchainDB,
			networkIdentifier: this._networkIdentifier,
			genesisBlock: genesis,
		});

		await this._network.init({
			nodeDB: this._nodeDB,
			logger: this._logger,
			networkIdentifier: this._networkIdentifier,
		});
		await this._consensus.init({
			db: this._blockchainDB,
			genesisBlock: genesis,
			logger: this._logger,
			moduleIDs: registeredModules.map(mod => mod.moduleID),
		});

		await this._generator.init({
			blockchainDB: this._blockchainDB,
			generatorDB: this._generatorDB,
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
		chainEndpoint.init(this._blockchainDB);
		const systemEndpoint = new SystemEndpoint({
			abi: this._abi,
			chain: this._chain,
			consensus: this._consensus,
			generator: this._generator,
			config: this._config,
		});

		for (const [name, handler] of Object.entries(getEndpointHandlers(chainEndpoint))) {
			this._rpcServer.registerEndpoint('chain', name, handler);
		}
		for (const [name, handler] of Object.entries(getEndpointHandlers(systemEndpoint))) {
			this._rpcServer.registerEndpoint('system', name, handler);
		}
		for (const [name, handler] of Object.entries(getEndpointHandlers(this._generator.endpoint))) {
			this._rpcServer.registerEndpoint('generator', name, handler);
		}
		this._rpcServer.registerNotFoundEndpoint(
			async (namespace: string, method: string, context: RequestContext) => {
				const { data } = await this._abi.query({
					header: this._chain.lastBlock.header.toObject(),
					networkIdentifier: this._chain.networkIdentifier,
					method: `${namespace}_${method}`,
					params: Buffer.from(JSON.stringify(context.params), 'utf-8'),
				});
				return JSON.parse(data.toString('utf-8')) as Record<string, unknown>;
			},
		);
	}

	private async _closeDB(): Promise<void> {
		await this._blockchainDB.close();
		await this._generatorDB.close();
		await this._nodeDB.close();
	}
}
