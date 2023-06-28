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

import { BFT } from '@liskhq/lisk-bft';
import {
	Block,
	Chain,
	DataAccess,
	GenesisBlock,
	Validator,
	BlockHeader,
	Transaction,
	AccountDefaultProps,
} from '@liskhq/lisk-chain';
import {
	getNetworkIdentifier,
	getPrivateAndPublicKeyFromPassphrase,
	getAddressAndPublicKeyFromPassphrase,
} from '@liskhq/lisk-cryptography';
import { Database } from '@liskhq/lisk-db';
import { objects } from '@liskhq/lisk-utils';

import { TokenModule, SequenceModule, KeysModule, DPoSModule } from '../modules';
import { Processor } from '../node/processor';
import { InMemoryChannel } from '../controller';
import { loggerMock, channelMock } from './mocks';
import { createBlock } from './create_block';
import {
	defaultConfig,
	defaultAccounts,
	createDefaultAccount,
	getHashOnionFromDefaultConfig,
	getPassphraseFromDefaultConfig,
	defaultFaucetAccount,
} from './fixtures';
import { createDB, removeDB, getAccountSchemaFromModules, getModuleInstance } from './utils';
import { ApplicationConfig, GenesisConfig } from '../types';
import { ModuleClass, PartialAccount } from './types';
import { createGenesisBlock } from './create_genesis_block';

type Options = {
	genesisConfig?: GenesisConfig;
	databasePath?: string;
	passphrase?: string;
};

interface BlockProcessingParams<T = AccountDefaultProps> {
	modules?: ModuleClass[];
	options?: Options;
	accounts?: PartialAccount<T>[];
	initDelegates?: Buffer[];
}

export interface BlockProcessingEnv {
	createBlock: (payload?: Transaction[], timestamp?: number) => Promise<Block>;
	getProcessor: () => Processor;
	getChain: () => Chain;
	getBlockchainDB: () => Database;
	process: (block: Block) => Promise<void>;
	processUntilHeight: (height: number) => Promise<void>;
	getLastBlock: () => Block;
	getValidators: () => Promise<Validator[]>;
	getNextValidatorPassphrase: (blockHeader: BlockHeader) => Promise<string>;
	getDataAccess: () => DataAccess;
	getNetworkId: () => Buffer;
	cleanup: (config: Options) => Promise<void>;
}

const defaultModules = [TokenModule, SequenceModule, KeysModule, DPoSModule];

const getAppConfig = (genesisConfig?: GenesisConfig): ApplicationConfig => {
	const mergedConfig = objects.mergeDeep(
		{},
		{
			...defaultConfig,
			genesisConfig: {
				...defaultConfig.genesisConfig,
				...(genesisConfig ?? {}),
			},
		},
	) as ApplicationConfig;

	return mergedConfig;
};

const getProcessor = (
	db: Database,
	appConfig: ApplicationConfig,
	genesisBlock: GenesisBlock,
	networkIdentifier: Buffer,
	params: BlockProcessingParams,
): Processor => {
	const channel = (channelMock as unknown) as InMemoryChannel;
	const modules = params.modules ?? defaultModules;

	const chainModule = new Chain({
		db,
		genesisBlock,
		networkIdentifier,
		maxPayloadLength: appConfig.genesisConfig.maxPayloadLength,
		rewardDistance: appConfig.genesisConfig.rewards.distance,
		rewardOffset: appConfig.genesisConfig.rewards.offset,
		rewardMilestones: appConfig.genesisConfig.rewards.milestones.map(s => BigInt(s)),
		blockTime: appConfig.genesisConfig.blockTime,
		minFeePerByte: appConfig.genesisConfig.minFeePerByte,
		baseFees: appConfig.genesisConfig.baseFees,
		accountSchemas: getAccountSchemaFromModules(modules),
		roundLength: appConfig.genesisConfig.roundLength,
	});

	const bftModule = new BFT({
		chain: chainModule,
		threshold: appConfig.genesisConfig.bftThreshold,
		genesisHeight: genesisBlock.header.height,
	});

	const processor = new Processor({
		channel,
		logger: loggerMock,
		chainModule,
		bftModule,
		config: appConfig.genesisConfig,
	});

	for (const InstantiableModule of modules) {
		const module = getModuleInstance(InstantiableModule, {
			genesisConfig: appConfig.genesisConfig,
		});
		processor.register(module);
	}

	return processor;
};

const getNextTimestamp = (processor: Processor, previousBlock: BlockHeader) => {
	const previousSlotNumber = processor['_chain'].slots.getSlotNumber(previousBlock.timestamp);

	return processor['_chain'].slots.getSlotTime(previousSlotNumber + 1);
};

const getMaxHeightPreviouslyForged = async (
	processor: Processor,
	previousBlock: BlockHeader,
	passphrase: string,
): Promise<number> => {
	const NUM_OF_ROUNDS = 3;
	const ROUND_LENGTH = defaultConfig.genesisConfig.roundLength;
	const toHeight = previousBlock.height;
	const fromHeight = Math.max(0, toHeight - ROUND_LENGTH * NUM_OF_ROUNDS);
	const { publicKey } = getPrivateAndPublicKeyFromPassphrase(passphrase);
	const lastBlockHeaders = await processor['_chain'].dataAccess.getBlockHeadersByHeightBetween(
		fromHeight,
		toHeight,
	);
	const maxHeightPreviouslyForged =
		lastBlockHeaders.find(h => h.generatorPublicKey.equals(publicKey))?.height ?? 0;

	return maxHeightPreviouslyForged;
};

const getHashOnion = async (
	processor: Processor,
	previousBlock: BlockHeader,
	passphrase: string,
): Promise<Buffer> => {
	const fromHeight = 0;
	const toHeight = previousBlock.height;
	const { publicKey, address } = getAddressAndPublicKeyFromPassphrase(passphrase);
	const lastBlockHeaders = await processor['_chain'].dataAccess.getBlockHeadersByHeightBetween(
		fromHeight,
		toHeight,
	);
	const hashCount = lastBlockHeaders.filter(h => h.generatorPublicKey.equals(publicKey)).length;

	return getHashOnionFromDefaultConfig(address, hashCount);
};

const createProcessableBlock = async (
	processor: Processor,
	networkIdentifier: Buffer,
	payload: Transaction[],
	timestamp?: number,
): Promise<Block> => {
	// Get previous block and generate valid timestamp, seed reveal, maxHeightPrevoted, reward and maxHeightPreviouslyForged
	const previousBlockHeader = processor['_chain'].lastBlock.header;
	const nextTimestamp = timestamp ?? getNextTimestamp(processor, previousBlockHeader);
	const validator = await processor['_chain'].getValidator(nextTimestamp);
	const passphrase = getPassphraseFromDefaultConfig(validator.address);
	const seedReveal = await getHashOnion(processor, previousBlockHeader, passphrase);
	const maxHeightPrevoted = await processor['_bft'].getMaxHeightPrevoted(
		previousBlockHeader.asset.maxHeightPrevoted,
	);
	const reward = processor['_chain'].calculateDefaultReward(previousBlockHeader.height + 1);
	const maxHeightPreviouslyForged = await getMaxHeightPreviouslyForged(
		processor,
		previousBlockHeader,
		passphrase,
	);

	return createBlock({
		passphrase,
		networkIdentifier,
		timestamp: nextTimestamp,
		previousBlockID: previousBlockHeader.id,
		header: {
			height: previousBlockHeader.height + 1,
			reward,
			asset: {
				maxHeightPreviouslyForged,
				maxHeightPrevoted,
				seedReveal,
			},
		},
		payload,
	});
};

const getDefaultAccountsWithModules = () => {
	const faucetAccount = {
		address: defaultFaucetAccount.address,
		token: { balance: BigInt(defaultFaucetAccount.balance) },
		sequence: { nonce: BigInt('0') },
	};
	const accounts = defaultAccounts().map((a, i) =>
		createDefaultAccount(defaultModules, {
			address: a.address,
			dpos: {
				delegate: {
					username: `delegate_${i}`,
				},
			},
		}),
	);

	return [...accounts, faucetAccount];
};

export const getBlockProcessingEnv = async (
	params: BlockProcessingParams,
): Promise<BlockProcessingEnv> => {
	const appConfig = getAppConfig(params.options?.genesisConfig);
	const modules = params.modules ?? defaultModules;
	const accounts = params.accounts ?? getDefaultAccountsWithModules();
	const { genesisBlock } = createGenesisBlock({ modules, accounts });
	const networkIdentifier = getNetworkIdentifier(
		genesisBlock.header.id,
		appConfig.genesisConfig.communityIdentifier,
	);
	removeDB(params.options?.databasePath);
	const db = createDB('blockchain', params.options?.databasePath);
	const processor = getProcessor(db, appConfig, genesisBlock, networkIdentifier, params);
	await processor.init(genesisBlock);

	return {
		createBlock: async (payload: Transaction[] = [], timestamp?: number): Promise<Block> =>
			createProcessableBlock(processor, networkIdentifier, payload, timestamp),
		getChain: () => processor['_chain'],
		getProcessor: () => processor,
		getBlockchainDB: () => db,
		process: async (block): Promise<void> => processor.process(block),
		processUntilHeight: async (height): Promise<void> => {
			for (let index = 0; index < height; index += 1) {
				const nextBlock = await createProcessableBlock(processor, networkIdentifier, []);
				await processor.process(nextBlock);
			}
		},
		getLastBlock: () => processor['_chain'].lastBlock,
		getValidators: async (): Promise<Validator[]> => processor['_chain'].getValidators(),
		getNextValidatorPassphrase: async (previousBlockHeader: BlockHeader): Promise<string> => {
			const nextTimestamp = getNextTimestamp(processor, previousBlockHeader);
			const validator = await processor['_chain'].getValidator(nextTimestamp);
			const passphrase = getPassphraseFromDefaultConfig(validator.address);

			return passphrase;
		},
		getNetworkId: () => networkIdentifier,
		getDataAccess: () => processor['_chain'].dataAccess,
		cleanup: async ({ databasePath }): Promise<void> => {
			await processor.stop();
			await db.close();
			removeDB(databasePath);
		},
	};
};
