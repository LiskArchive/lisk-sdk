/* eslint-disable dot-notation */
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
 *
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Block, Chain, DataAccess, BlockHeader, Transaction, StateStore } from '@liskhq/lisk-chain';
import { Database, StateDB } from '@liskhq/lisk-db';
import { objects } from '@liskhq/lisk-utils';
import { codec } from '@liskhq/lisk-codec';
import { BaseModule } from '../modules';
import { channelMock } from './mocks';
import {
	defaultConfig,
	getGeneratorPrivateKeyFromDefaultConfig,
	getKeysFromDefaultConfig,
	Keys,
} from './fixtures';
import { removeDB } from './utils';
import { ApplicationConfig, EndpointHandler, GenesisConfig } from '../types';
import { Consensus } from '../engine/consensus';
import { MethodContext, StateMachine } from '../state_machine';
import { Engine } from '../engine';
import {
	createImmutableMethodContext,
	createNewMethodContext,
} from '../state_machine/method_context';
import { blockAssetsJSON } from './fixtures/genesis-asset';
import { ValidatorsModule } from '../modules/validators';
import { TokenModule } from '../modules/token';
import { AuthModule } from '../modules/auth';
import { FeeModule } from '../modules/fee';
import { RewardModule } from '../modules/reward';
import { RandomModule } from '../modules/random';
import { DPoSModule } from '../modules/dpos_v2';
import { Generator } from '../engine/generator';
import { ABIHandler } from '../abi_handler/abi_handler';
import { generateGenesisBlock } from '../genesis_block';
import { systemDirs } from '../system_dirs';
import { PrefixedStateReadWriter } from '../state_machine/prefixed_state_read_writer';
import { createLogger } from '../logger';

type Options = {
	genesis?: GenesisConfig;
	databasePath?: string;
	passphrase?: string;
};

interface BlockProcessingParams {
	modules?: BaseModule[];
	options?: Options;
	initDelegates?: Buffer[];
	logLevel?: string;
}

export interface BlockProcessingEnv {
	createBlock: (transactions?: Transaction[], timestamp?: number) => Promise<Block>;
	getConsensus: () => Consensus;
	getConsensusStore: () => StateStore;
	getGenerator: () => Generator;
	getGenesisBlock: () => Block;
	getChain: () => Chain;
	getMethodContext: () => MethodContext;
	getBlockchainDB: () => Database;
	process: (block: Block) => Promise<void>;
	processUntilHeight: (height: number) => Promise<void>;
	getLastBlock: () => Block;
	getNextValidatorKeys: (blockHeader: BlockHeader) => Promise<Keys>;
	getDataAccess: () => DataAccess;
	getNetworkId: () => Buffer;
	invoke: <T = void>(path: string, params?: Record<string, unknown>) => Promise<T>;
	cleanup: (config: Options) => void;
}

const getAppConfig = (
	genesisConfig?: Partial<GenesisConfig>,
	moduleConfig?: Record<string, Record<string, unknown>>,
): ApplicationConfig => {
	const mergedConfig = objects.mergeDeep(
		{},
		{
			...defaultConfig,
			system: {
				...defaultConfig.system,
				dataPath: path.join(os.tmpdir(), `lisk-framework-test-${Date.now().toString()}`),
			},
			genesis: {
				...defaultConfig.genesis,
				...(genesisConfig ?? {}),
			},
			modules: {
				...(moduleConfig ?? {}),
			},
		},
	) as ApplicationConfig;

	return mergedConfig;
};

const getNextTimestamp = (engine: Engine, previousBlock: BlockHeader) => {
	const previousSlotNumber = engine['_consensus'].getSlotNumber(previousBlock.timestamp);
	return engine['_consensus'].getSlotTime(previousSlotNumber + 1);
};

const createProcessableBlock = async (
	engine: Engine,
	transactions: Transaction[],
	timestamp?: number,
): Promise<Block> => {
	engine['_logger'].info({ transactions: transactions.length }, 'Start generating block');
	// Get previous block and generate valid timestamp, seed reveal, maxHeightPrevoted, reward and maxHeightPreviouslyForged
	const stateStore = new StateStore(engine['_blockchainDB']);
	const previousBlockHeader = engine['_chain'].lastBlock.header;
	const nextTimestamp = timestamp ?? getNextTimestamp(engine, previousBlockHeader);
	const validator = await engine['_consensus'].getGeneratorAtTimestamp(
		stateStore,
		previousBlockHeader.height + 1,
		nextTimestamp,
	);
	const generatorPrivateKey = getGeneratorPrivateKeyFromDefaultConfig(validator);
	for (const tx of transactions) {
		await engine['_generator']['_pool'].add(tx);
	}
	const block = await engine.generateBlock({
		generatorAddress: validator,
		height: previousBlockHeader.height + 1,
		privateKey: generatorPrivateKey,
		timestamp: nextTimestamp,
		transactions,
	});
	engine['_logger'].info(
		{ height: block.header.height, transactions: block.transactions.length },
		'Generated block',
	);

	return block;
};

export const getBlockProcessingEnv = async (
	params: BlockProcessingParams,
): Promise<BlockProcessingEnv> => {
	const chainID = Buffer.from('00000000', 'hex');
	const appConfig = getAppConfig(
		params.options?.genesis
			? {
					...params.options.genesis,
					chainID: chainID.toString('hex'),
			  }
			: { chainID: chainID.toString('hex') },
	);

	const systemDir = systemDirs(appConfig.system.dataPath);

	removeDB(systemDir.data);
	const moduleDB = new Database(path.join(systemDir.data, 'module.db'));
	const stateDB = new StateDB(path.join(systemDir.data, 'state.db'));

	const validatorsModule = new ValidatorsModule();
	const authModule = new AuthModule();
	const tokenModule = new TokenModule();
	const feeModule = new FeeModule();
	const rewardModule = new RewardModule();
	const randomModule = new RandomModule();
	const dposModule = new DPoSModule();
	const modules = [
		validatorsModule,
		authModule,
		tokenModule,
		feeModule,
		rewardModule,
		randomModule,
		dposModule,
	];
	const stateMachine = new StateMachine();
	const logger = createLogger({ name: 'blockProcessingEnv', logLevel: params.logLevel ?? 'none' });

	// resolve dependencies
	feeModule.addDependencies(tokenModule.method);
	rewardModule.addDependencies(tokenModule.method, randomModule.method);
	dposModule.addDependencies(randomModule.method, validatorsModule.method, tokenModule.method);

	// register modules
	stateMachine.registerModule(authModule);
	stateMachine.registerModule(validatorsModule);
	stateMachine.registerModule(tokenModule);
	stateMachine.registerModule(feeModule);
	stateMachine.registerModule(rewardModule);
	stateMachine.registerModule(randomModule);
	stateMachine.registerModule(dposModule);
	const blockAssets = blockAssetsJSON.map(asset => ({
		...asset,
		data: codec.fromJSON<Record<string, unknown>>(asset.schema, asset.data),
	}));
	await stateMachine.init(logger, appConfig.genesis, appConfig.modules);
	const genesisBlock = await generateGenesisBlock(stateMachine, logger, {
		timestamp: Math.floor(Date.now() / 1000) - 60 * 60,
		assets: blockAssets,
	});
	const abiHandler = new ABIHandler({
		channel: channelMock,
		config: appConfig,
		logger,
		stateDB,
		moduleDB,
		modules,
		stateMachine,
	});
	appConfig.genesis.block.blob = genesisBlock.getBytes().toString('hex');
	appConfig.generator.keys.fromFile = path.join(__dirname, './fixtures/keys_fixture.json');
	const engine = new Engine(abiHandler, appConfig);
	await engine['_init']();
	engine['_logger'] = logger;

	await abiHandler.init({
		chainID,
		lastBlockHeight: engine['_chain'].lastBlock.header.height,
		lastStateRoot: engine['_chain'].lastBlock.header.stateRoot as Buffer,
	});

	return {
		createBlock: async (transactions: Transaction[] = [], timestamp?: number): Promise<Block> =>
			createProcessableBlock(engine, transactions, timestamp),
		getGenesisBlock: () => genesisBlock,
		getChain: () => engine['_chain'],
		getConsensus: () => engine['_consensus'],
		getConsensusStore: () => new StateStore(engine['_blockchainDB']),
		getGenerator: () => engine['_generator'],
		getMethodContext: () => createNewMethodContext(stateDB.newReadWriter()),
		getBlockchainDB: () => engine['_blockchainDB'],
		process: async (block): Promise<void> => {
			logger.debug(
				{ height: block.header.height, transactions: block.transactions.length },
				'start executing block',
			);
			await engine['_consensus']['_execute'](block, 'peer-id');
			logger.debug(
				{ height: block.header.height, transactions: block.transactions.length },
				'executed block',
			);
		},
		processUntilHeight: async (height): Promise<void> => {
			while (engine['_chain'].lastBlock.header.height < height) {
				const nextBlock = await createProcessableBlock(engine, []);
				await engine['_consensus'].execute(nextBlock);
			}
		},
		getLastBlock: () => engine['_chain'].lastBlock,
		getNextValidatorKeys: async (previousBlockHeader: BlockHeader): Promise<Keys> => {
			const stateStore = new StateStore(engine['_blockchainDB']);
			const nextTimestamp = getNextTimestamp(engine, previousBlockHeader);
			const validator = await engine['_consensus'].getGeneratorAtTimestamp(
				stateStore,
				previousBlockHeader.height + 1,
				nextTimestamp,
			);
			const keys = getKeysFromDefaultConfig(validator);

			return keys;
		},
		async invoke<T = void>(func: string, input: Record<string, unknown> = {}): Promise<T> {
			const [namespace, method] = func.split('_');
			const handler = engine['_rpcServer']['_getHandler'](namespace, method);
			if (handler) {
				const resp = (await handler({
					logger,
					chainID: engine['_chain'].chainID,
					params: input,
				})) as T;
				return resp;
			}
			const moduleIndex = modules.findIndex(mod => mod.name === namespace);
			if (moduleIndex < 0) {
				throw new Error(`namespace ${namespace} is not registered`);
			}
			const moduleHandler = modules[moduleIndex].endpoint[method] as EndpointHandler | undefined;
			if (!moduleHandler) {
				throw new Error(`Method ${method} in namespace ${namespace} is not registered`);
			}
			const bindedHandler = moduleHandler.bind(modules[moduleIndex].endpoint);

			const stateStore = new PrefixedStateReadWriter(stateDB.newReadWriter());

			const result = await bindedHandler({
				getStore: (moduleID: Buffer, storePrefix: Buffer) =>
					stateStore.getStore(moduleID, storePrefix),
				getImmutableMethodContext: () => createImmutableMethodContext(stateStore),
				logger: engine['_logger'],
				chainID: engine['_chain'].chainID,
				params: input,
			});

			return result as T;
		},
		getNetworkId: () => chainID,
		getDataAccess: () => engine['_chain'].dataAccess,
		cleanup: (_val): void => {
			engine['_closeDB']();
			moduleDB.close();
			stateDB.close();
			fs.removeSync(systemDir.data);
		},
	};
};
